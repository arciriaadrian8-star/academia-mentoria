"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { safeUrl, str, strOrNull } from "@/lib/utils";

export async function updateSettings(formData: FormData) {
  const { supabase } = await requireAdmin();
  const color = str(formData, "primary_color");
  const { error } = await supabase
    .from("settings")
    .update({
      academy_name: str(formData, "academy_name") || "Mi Academia",
      tagline: strOrNull(formData, "tagline"),
      primary_color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#4f46e5",
      logo_url: safeUrl(strOrNull(formData, "logo_url")),
      welcome_message: strOrNull(formData, "welcome_message"),
      allow_signup: formData.get("allow_signup") === "on",
      auto_approve: formData.get("auto_approve") === "on",
    })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/ajustes?guardado=1");
}
