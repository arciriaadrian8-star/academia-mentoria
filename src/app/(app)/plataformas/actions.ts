"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PLATFORM_CATEGORIES } from "@/lib/constants";
import { safeUrl, str, strOrNull } from "@/lib/utils";

function payload(formData: FormData) {
  const url = safeUrl(strOrNull(formData, "url"));
  if (!url) throw new Error("El enlace de la plataforma no es válido");
  const category = PLATFORM_CATEGORIES.some((c) => c.id === str(formData, "category")) ? str(formData, "category") : "otros";
  return {
    name: str(formData, "name"),
    description: strOrNull(formData, "description"),
    url,
    category,
    logo_url: safeUrl(strOrNull(formData, "logo_url")),
    tutorial_url: safeUrl(strOrNull(formData, "tutorial_url")),
    perk: strOrNull(formData, "perk"),
    position: parseInt(str(formData, "position"), 10) || 0,
  };
}

export async function createPlatform(formData: FormData) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("platforms").insert(payload(formData));
  if (error) throw error;
  revalidatePath("/plataformas");
  redirect("/plataformas");
}

export async function updatePlatform(formData: FormData) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("platforms").update(payload(formData)).eq("id", str(formData, "id"));
  if (error) throw error;
  revalidatePath("/plataformas");
  redirect("/plataformas");
}

export async function deletePlatform(formData: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("platforms").delete().eq("id", str(formData, "id"));
  revalidatePath("/plataformas");
  redirect("/plataformas");
}
