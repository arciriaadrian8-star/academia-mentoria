"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireStaff } from "@/lib/auth";
import { ROADMAP_KEYS } from "@/lib/roadmap";
import { CURRENCIES, weekStart } from "@/lib/kit";
import { safeUrl, str, strOrNull } from "@/lib/utils";

/* ------------------------------------------------------------ ruta 30 días */

export async function toggleRoadmapTask(key: string, done: boolean) {
  if (!ROADMAP_KEYS.includes(key)) return;
  const { supabase, user } = await requireActive();
  if (done) {
    await supabase.from("roadmap_progress").upsert({ user_id: user.id, task_key: key }, { onConflict: "user_id,task_key", ignoreDuplicates: true });
  } else {
    await supabase.from("roadmap_progress").delete().eq("user_id", user.id).eq("task_key", key);
  }
  revalidatePath("/kit/ruta");
  revalidatePath("/kit");
}

/* ------------------------------------------------------- reporte semanal */

export type ReportState = { error?: string; ok?: boolean } | null;

const n = (fd: FormData, k: string) => {
  const v = parseFloat(str(fd, k).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

export async function saveReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const { supabase, user } = await requireActive();
  const rawWeek = str(formData, "week_start");
  const date = rawWeek ? new Date(`${rawWeek}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Elige una fecha válida." };
  const currency = CURRENCIES.some((c) => c.code === str(formData, "currency")) ? str(formData, "currency") : "COP";
  const orders = Math.max(Math.round(n(formData, "orders")), 0);
  const delivered = Math.max(Math.round(n(formData, "delivered")), 0);
  if (delivered > orders) return { error: "Los entregados no pueden ser más que los pedidos." };
  const row = {
    user_id: user.id,
    week_start: weekStart(date),
    currency,
    orders,
    delivered,
    revenue: Math.max(n(formData, "revenue"), 0),
    ad_spend: Math.max(n(formData, "ad_spend"), 0),
    profit: n(formData, "profit"),
    notes: strOrNull(formData, "notes")?.slice(0, 2000) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("progress_reports").upsert(row, { onConflict: "user_id,week_start" });
  if (error) return { error: `No se pudo guardar: ${error.message}` };
  revalidatePath("/kit/progreso");
  return { ok: true };
}

export async function deleteReport(formData: FormData) {
  const { supabase, user } = await requireActive();
  await supabase.from("progress_reports").delete().eq("id", str(formData, "id")).eq("user_id", user.id);
  revalidatePath("/kit/progreso");
}

/* ------------------------------------------------------- revisión de tienda */

export type ReviewState = { error?: string } | null;

export async function requestReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const { supabase, user } = await requireActive();
  const storeUrl = safeUrl(strOrNull(formData, "store_url"));
  if (!storeUrl) return { error: "Pega el enlace de tu tienda (https://...)." };
  const { count } = await supabase
    .from("store_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pendiente");
  if ((count ?? 0) >= 2) return { error: "Ya tienes 2 revisiones pendientes. Espera la respuesta antes de pedir otra." };
  const { error } = await supabase.from("store_reviews").insert({
    user_id: user.id,
    store_url: storeUrl.slice(0, 500),
    product: strOrNull(formData, "product")?.slice(0, 200) ?? null,
    ad_url: safeUrl(strOrNull(formData, "ad_url"))?.slice(0, 500) ?? null,
    question: strOrNull(formData, "question")?.slice(0, 3000) ?? null,
  });
  if (error) return { error: `No se pudo enviar: ${error.message}` };
  revalidatePath("/kit/revision");
  redirect("/kit/revision?enviada=1");
}

export async function answerReview(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const id = str(formData, "id");
  await supabase
    .from("store_reviews")
    .update({ feedback: strOrNull(formData, "feedback")?.slice(0, 10000) ?? null, status: "revisada", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/kit/revision");
  redirect(`/kit/revision#r-${id}`);
}

export async function deleteReview(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("store_reviews").delete().eq("id", str(formData, "id"));
  revalidatePath("/kit/revision");
}
