"use server";

import { revalidatePath } from "next/cache";
import { requireActive, requireStaff } from "@/lib/auth";
import { CURRENCIES } from "@/lib/kit";
import { safeUrl, str, strOrNull } from "@/lib/utils";

export type ResultState = { error?: string; ok?: boolean } | null;

export async function postResult(_prev: ResultState, formData: FormData): Promise<ResultState> {
  const { supabase, user, isStaff } = await requireActive();
  const title = str(formData, "title");
  if (title.length < 3) return { error: "Escribe un título (mínimo 3 letras)." };
  const image = safeUrl(strOrNull(formData, "image_url"));
  const rawAmount = parseFloat(str(formData, "amount").replace(/[^\d.,]/g, "").replace(",", "."));
  const currency = CURRENCIES.some((c) => c.code === str(formData, "currency")) ? str(formData, "currency") : null;
  const { error } = await supabase.from("results").insert({
    user_id: user.id,
    title: title.slice(0, 120),
    body: strOrNull(formData, "body")?.slice(0, 3000) ?? null,
    image_url: image,
    amount: Number.isFinite(rawAmount) && rawAmount >= 0 ? rawAmount : null,
    currency,
    verified: isStaff,
  });
  if (error) return { error: `No se pudo publicar: ${error.message}` };
  revalidatePath("/resultados");
  revalidatePath("/inicio");
  return { ok: true };
}

export async function toggleVerified(formData: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("results").update({ verified: str(formData, "verified") === "1" }).eq("id", str(formData, "id"));
  revalidatePath("/resultados");
}

export async function deleteResult(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("results").delete().eq("id", str(formData, "id"));
  revalidatePath("/resultados");
}
