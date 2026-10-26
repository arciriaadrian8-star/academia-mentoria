"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSettings, requireAdmin } from "@/lib/auth";
import { LEVEL_COLORS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Credentials, Role } from "@/lib/types";
import { str } from "@/lib/utils";

const ROLES: Role[] = ["admin", "coach", "member"];

function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

async function loginUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/login`;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/login`;
}

async function setLevels(userId: string, levels: string[]) {
  const admin = createAdminClient();
  await admin.from("member_access").delete().eq("user_id", userId);
  if (levels.length) {
    await admin.from("member_access").insert(levels.map((access_level_id) => ({ user_id: userId, access_level_id })));
  }
}

export async function createMember(_prev: Credentials | null, formData: FormData): Promise<Credentials> {
  await requireAdmin();
  const fullName = str(formData, "full_name");
  const email = str(formData, "email").toLowerCase();
  const role = ROLES.includes(str(formData, "role") as Role) ? (str(formData, "role") as Role) : "member";
  if (!fullName || !email) return { error: "Escribe el nombre y el email." };

  const password = generatePassword();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    const exists = error?.message.toLowerCase().includes("already");
    return { error: exists ? "Ya existe un usuario con ese email." : `No se pudo crear: ${error?.message}` };
  }

  await admin.from("profiles").update({ full_name: fullName, role, active: true }).eq("id", data.user.id);
  await setLevels(data.user.id, formData.getAll("levels").map(String));
  revalidatePath("/miembros");

  const settings = await getSettings();
  return { name: fullName, email, password, loginUrl: await loginUrl(), academy: settings.academy_name };
}

export async function updateMember(formData: FormData) {
  const { user } = await requireAdmin();
  const id = str(formData, "id");
  const update: Record<string, unknown> = { full_name: str(formData, "full_name") };
  // Un admin no puede quitarse permisos a sí mismo por accidente.
  if (id !== user.id) {
    const role = str(formData, "role") as Role;
    if (ROLES.includes(role)) update.role = role;
    update.active = formData.get("active") === "on";
  }
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) throw error;
  await setLevels(id, formData.getAll("levels").map(String));
  revalidatePath("/miembros", "layout");
  redirect(`/miembros/${id}?guardado=1`);
}

export async function resetMemberPassword(_prev: Credentials | null, formData: FormData): Promise<Credentials> {
  await requireAdmin();
  const id = str(formData, "id");
  const password = generatePassword();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: `No se pudo cambiar: ${error.message}` };
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", id).single();
  const settings = await getSettings();
  return {
    name: profile?.full_name ?? "",
    email: data.user.email,
    password,
    loginUrl: await loginUrl(),
    academy: settings.academy_name,
  };
}

export async function deleteMember(formData: FormData) {
  const { user } = await requireAdmin();
  const id = str(formData, "id");
  if (id === user.id) throw new Error("No puedes borrar tu propia cuenta.");
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) throw error;
  revalidatePath("/miembros");
  redirect("/miembros");
}

// ---------- NIVELES DE ACCESO ----------

export async function createLevel(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(formData, "name");
  if (!name) return;
  const { count } = await supabase.from("access_levels").select("id", { count: "exact", head: true });
  await supabase.from("access_levels").insert({ name, color: str(formData, "color") || LEVEL_COLORS[(count ?? 0) % LEVEL_COLORS.length] });
  revalidatePath("/miembros", "layout");
}

export async function updateLevel(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(formData, "name");
  if (!name) return;
  await supabase.from("access_levels").update({ name, color: str(formData, "color") }).eq("id", str(formData, "id"));
  revalidatePath("/miembros", "layout");
}

export async function deleteLevel(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("access_levels").delete().eq("id", str(formData, "id"));
  revalidatePath("/miembros", "layout");
}
