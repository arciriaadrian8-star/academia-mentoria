"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { COUNTRIES, VIDEO_FORMATS } from "@/lib/kit";
import { str, strOrNull } from "@/lib/utils";


export type ScriptState = { error?: string } | null;

export async function createScript(_prev: ScriptState, formData: FormData): Promise<ScriptState> {
  const { supabase, user, isStaff } = await requireActive();
  const product = str(formData, "product");
  const description = str(formData, "description");
  const videoPath = str(formData, "video_path");
  if (product.length < 2) return { error: "Escribe el nombre del producto." };
  if (description.length < 5) return { error: "Describe el producto (qué es y qué problema resuelve)." };
  if (!videoPath.startsWith(`${user.id}/`)) return { error: "Primero sube el video." };

  if (!isStaff) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase.from("ai_scripts").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= 5) {
      await supabase.storage.from("ai-videos").remove([videoPath]);
      return { error: "Llegaste al límite de 5 análisis por día. Vuelve mañana." };
    }
  }

  const country = COUNTRIES.includes(str(formData, "country") as (typeof COUNTRIES)[number]) ? str(formData, "country") : "Colombia";
  const format = VIDEO_FORMATS.some((f) => f.id === str(formData, "format")) ? str(formData, "format") : "mismo";

  const { data, error } = await supabase
    .from("ai_scripts")
    .insert({
      user_id: user.id,
      product: product.slice(0, 120),
      description: description.slice(0, 1500),
      country,
      price: strOrNull(formData, "price")?.slice(0, 40) ?? null,
      offer: strOrNull(formData, "offer")?.slice(0, 200) ?? null,
      format,
      video_path: videoPath,
    })
    .select("id")
    .single();
  if (error) return { error: `No se pudo crear: ${error.message}` };

  // La función responde de inmediato y sigue trabajando en segundo plano.
  await supabase.functions.invoke("analizar-video", { body: { id: data.id } });
  revalidatePath("/kit/video-ia");
  redirect(`/kit/video-ia/${data.id}`);
}

export async function deleteScript(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("ai_scripts").delete().eq("id", str(formData, "id"));
  revalidatePath("/kit/video-ia");
  redirect("/kit/video-ia");
}
