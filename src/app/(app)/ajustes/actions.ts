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
      landing_budget_pct: clampNum(str(formData, "landing_budget_pct"), 0, 100, 3),
      landing_image_model: IMAGE_MODELS.some((m) => m.id === str(formData, "landing_image_model")) ? str(formData, "landing_image_model") : IMAGE_MODELS[0].id,
      landing_default_usd_kit: clampNum(str(formData, "landing_default_usd_kit"), 0, 100000, 14),
      landing_default_usd_member: clampNum(str(formData, "landing_default_usd_member"), 0, 100000, 14),
    })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/ajustes?guardado=1");
}
