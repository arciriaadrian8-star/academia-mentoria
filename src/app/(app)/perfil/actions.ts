"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { passwordErrorMessage, safeUrl, str, strOrNull } from "@/lib/utils";

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireActive();
  await supabase
    .from("profiles")
    .update({
      full_name: str(formData, "full_name"),
      bio: strOrNull(formData, "bio"),
      avatar_url: safeUrl(strOrNull(formData, "avatar_url")),
    })
    .eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/perfil?guardado=1");
}

export async function changePassword(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { supabase } = await requireActive();
  const password = str(formData, "password");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== str(formData, "confirm")) return { error: "Las contraseñas no coinciden." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: passwordErrorMessage(error) };
  return { ok: true };
}
