"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { IMAGE_MODELS } from "@/lib/landing";
import { safeUrl, str, strOrNull } from "@/lib/utils";

const clampNum = (raw: string, min: number, max: number, fallback: number) => {
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n)) * 100) / 100 : fallback;
};

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
      landing_image_model: IMAGE_MODELS.some((m) => m.id === str(formData, "landing_image_model")) ? str(formData, "landing_image_model") : IMAGE_MODELS[0].id,
      landing_max_cop: Math.round(clampNum(str(formData, "landing_max_cop"), 0, 10000, 500)),
      points_monthly_kit: Math.round(clampNum(str(formData, "points_monthly_kit"), 0, 1000000, 1000)),
      points_monthly_member: Math.round(clampNum(str(formData, "points_monthly_member"), 0, 1000000, 1000)),
      points_landing: Math.round(clampNum(str(formData, "points_landing"), 0, 100000, 270)),
      points_redo: Math.round(clampNum(str(formData, "points_redo"), 0, 100000, 80)),
    })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/ajustes?guardado=1");
}
