"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireAdmin } from "@/lib/auth";
import { safeUrl, str, strOrNull } from "@/lib/utils";

/** El alumno marca que ya vio el vídeo de inducción. */
export async function markWelcomeSeen() {
  const { supabase, user } = await requireActive();
  await supabase.from("profiles").update({ welcome_seen_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
}

export async function updateOnboarding(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("onboarding")
    .update({
      video_url: safeUrl(strOrNull(formData, "video_url")),
      content: strOrNull(formData, "content"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/inicio");
  redirect(str(formData, "redirect") || "/inicio");
}
