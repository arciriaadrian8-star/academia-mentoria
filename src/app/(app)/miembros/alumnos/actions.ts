"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLATFORMS, STUDENT_INTERVALS, parseAmount, parseDate, suggestCoversUntil, todayISO,
  type Currency, type Enrollment, type Platform, type Program,
} from "@/lib/students";
import { str, strOrNull } from "@/lib/utils";

const BASE = "/miembros/alumnos";
const PLATFORM_KEYS = Object.keys(PLATFORMS) as Platform[];

function refresh(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
}

const msg = (path: string, kind: "ok" | "error", text: string) => redirect(`${path}?${kind}=${encodeURIComponent(text)}`);

/** Busca la cuenta de la academia con ese correo para ligarla. */
async function findUserByEmail(email: string | null) {
  if (!email) return null;
  const { data } = await createAdminClient().from("profiles").select("id").ilike("email", email).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Si el alumno tiene cuenta en la academia, al pagar se le activa el acceso.
 * Las cuentas «Solo Kit» además quedan con acceso hasta la fecha pagada (+3 días de gracia).
 */
async function syncAccess(userId: string | null, coversUntil: string | null) {
  if (!userId) return;
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!prof || prof.role === "admin" || prof.role === "coach") return;
  const update: Record<string, unknown> = { active: true, pending: false };
  if (prof.role === "kit") {
    update.access_until = coversUntil
      ? new Date(new Date(`${coversUntil}T23:59:59-05:00`).getTime() + 3 * 86_400_000).toISOString()
      : null;
  }
  await admin.from("profiles").update(update).eq("id", userId);
}

function enrollmentFields(formData: FormData) {
  const platform = (PLATFORM_KEYS.includes(str(formData, "platform") as Platform) ? str(formData, "platform") : "otro") as Platform;
  const currency: Currency = str(formData, "currency") === "USD" ? "USD" : "COP";
  const intervalRaw = parseInt(str(formData, "interval_days"), 10);
  const interval = STUDENT_INTERVALS.some((i) => i.days === intervalRaw) ? intervalRaw : 30;
  const billing = str(formData, "billing");
  const amount = parseAmount(str(formData, "amount"), currency);
  const whatsapp = str(formData, "whatsapp").replace(/\D/g, "");
  const sessions = parseInt(str(formData, "sessions_included"), 10);
  const status = str(formData, "status");
  return {
    full_name: str(formData, "full_name").slice(0, 120),
    email: strOrNull(formData, "email")?.toLowerCase().slice(0, 200) ?? null,
    whatsapp: /^[0-9]{8,15}$/.test(whatsapp) ? whatsapp : null,
    program: (str(formData, "program") === "acompanamiento" ? "acompanamiento" : "membresia") as Program,
    plan_name: strOrNull(formData, "plan_name")?.slice(0, 80) ?? null,
    platform,
    auto_renew: billing === "auto" ? true : billing === "manual" ? false : PLATFORMS[platform].auto,
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    currency,
    interval_days: interval === 0 ? null : interval,
    start_date: parseDate(str(formData, "start_date")) ?? todayISO(),
    paid_until: parseDate(str(formData, "paid_until")),
    end_date: parseDate(str(formData, "end_date")),
    sessions_included: Number.isFinite(sessions) && sessions >= 0 ? Math.min(sessions, 1000) : null,
    status: ["activo", "pausado", "cancelado", "finalizado"].includes(status) ? status : "activo",
    notes: strOrNull(formData, "notes")?.slice(0, 2000) ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function saveEnrollment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const fields = enrollmentFields(formData);
  const back = id ? `${BASE}/${id}` : `${BASE}/nuevo`;
  if (!fields.full_name) msg(back, "error", "Escribe el nombre del alumno.");

  let userId: string | null = strOrNull(formData, "user_id");
  if (!userId) userId = await findUserByEmail(fields.email);

  if (id) {
    const { error } = await supabase.from("student_enrollments").update({ ...fields, user_id: userId }).eq("id", id);
    if (error) msg(back, "error", error.message);
    refresh(id);
    msg(back, "ok", "Cambios guardados.");
  }

  const { data, error } = await supabase.from("student_enrollments").insert({ ...fields, user_id: userId }).select("id").single();
  if (error || !data) msg(back, "error", error?.message ?? "No se pudo guardar.");
  refresh();
  msg(`${BASE}/${data!.id}`, "ok", userId ? "Alumno agregado y ligado a su cuenta de la academia." : "Alumno agregado.");
}

export async function deleteEnrollment(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("student_enrollments").delete().eq("id", str(formData, "id"));
  refresh();
  msg(BASE, "ok", "Alumno eliminado del control.");
}

export async function unlinkAccount(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  await supabase.from("student_enrollments").update({ user_id: null }).eq("id", id);
  refresh(id);
}

/** Registra un pago (manual de Nequi/Wompi o la renovación de Whop/Skool) y corre la fecha de corte. */
export async function registerPayment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "enrollment_id");
  const back = str(formData, "back") === "list" ? BASE : `${BASE}/${id}`;
  const { data: row } = await supabase.from("student_enrollments").select("*").eq("id", id).maybeSingle();
  const e = row as Enrollment | null;
  if (!e) msg(BASE, "error", "No encontré ese alumno.");

  const paidAt = parseDate(str(formData, "paid_at")) ?? todayISO();
  const currency: Currency = str(formData, "currency") === "USD" ? "USD" : str(formData, "currency") === "COP" ? "COP" : e!.currency;
  const amountRaw = str(formData, "amount");
  const amount = amountRaw ? parseAmount(amountRaw, currency) : e!.amount;
  if (!Number.isFinite(amount) || amount <= 0) msg(back, "error", "Escribe el valor que pagó.");
  const coversUntil = parseDate(str(formData, "covers_until")) ?? suggestCoversUntil(e!, paidAt);
  const platform = (PLATFORM_KEYS.includes(str(formData, "platform") as Platform) ? str(formData, "platform") : e!.platform) as Platform;

  const { error } = await supabase.from("student_payments").insert({
    enrollment_id: id,
    paid_at: paidAt,
    amount,
    currency,
    platform,
    reference: strOrNull(formData, "reference")?.slice(0, 120) ?? null,
    note: strOrNull(formData, "note")?.slice(0, 500) ?? null,
    covers_until: coversUntil,
  });
  if (error) msg(back, "error", error.message);

  await supabase
    .from("student_enrollments")
    .update({ paid_until: coversUntil, status: e!.status === "pausado" ? "activo" : e!.status, updated_at: new Date().toISOString() })
    .eq("id", id);
  await syncAccess(e!.user_id, coversUntil);
  refresh(id);
  msg(back, "ok", `Pago de ${e!.full_name} registrado${coversUntil ? `. Queda al día hasta el ${coversUntil.split("-").reverse().join("/")}` : ""}.`);
}

export async function deletePayment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "enrollment_id");
  await supabase.from("student_payments").delete().eq("id", str(formData, "id")).eq("enrollment_id", id);
  // La fecha de corte vuelve a la del último pago que quede (o a la que tenía si no hay más pagos con fecha).
  const { data: last } = await supabase
    .from("student_payments").select("covers_until").eq("enrollment_id", id).not("covers_until", "is", null)
    .order("covers_until", { ascending: false }).limit(1).maybeSingle();
  if (last?.covers_until) await supabase.from("student_enrollments").update({ paid_until: last.covers_until }).eq("id", id);
  refresh(id);
  msg(`${BASE}/${id}`, "ok", "Pago borrado. Revisa la fecha «Pagado hasta».");
}

export async function addFollowup(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = str(formData, "enrollment_id");
  const note = str(formData, "note").slice(0, 2000);
  const kind = ["sesion", "nota", "recordatorio"].includes(str(formData, "kind")) ? str(formData, "kind") : "nota";
  if (!note) msg(`${BASE}/${id}`, "error", "Escribe qué pasó en la sesión o la nota.");
  await supabase.from("student_followups").insert({
    enrollment_id: id,
    kind,
    note,
    happened_at: parseDate(str(formData, "happened_at")) ?? todayISO(),
    created_by: user.id,
  });
  refresh(id);
  msg(`${BASE}/${id}`, "ok", kind === "sesion" ? "Sesión registrada." : "Nota guardada.");
}

export async function deleteFollowup(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "enrollment_id");
  await supabase.from("student_followups").delete().eq("id", str(formData, "id")).eq("enrollment_id", id);
  refresh(id);
}

/** Se llama al abrir el WhatsApp del recordatorio: deja constancia en el seguimiento. */
export async function markReminded(id: string) {
  const { supabase, user } = await requireAdmin();
  await supabase.from("student_enrollments").update({ last_reminder_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("student_followups").insert({ enrollment_id: id, kind: "recordatorio", note: "Recordatorio de pago enviado por WhatsApp.", created_by: user.id });
  refresh(id);
}

/** Quita o devuelve el acceso a la academia de un alumno con cuenta ligada. */
export async function setAccountAccess(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "user_id");
  const id = str(formData, "id");
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!prof || prof.role === "admin" || prof.role === "coach") msg(`${BASE}/${id}`, "error", "No se le puede cambiar el acceso a un admin o coach.");
  await admin.from("profiles").update({ active: str(formData, "active") === "true" }).eq("id", userId);
  revalidatePath("/miembros");
  refresh(id);
  msg(str(formData, "back") === "list" ? BASE : `${BASE}/${id}`, "ok", str(formData, "active") === "true" ? "Acceso activado." : "Acceso quitado.");
}

export async function saveBillingConfig(formData: FormData) {
  const { supabase } = await requireAdmin();
  const days = parseInt(str(formData, "reminder_days"), 10);
  const before = parseInt(str(formData, "days_before"), 10);
  const { error } = await supabase.from("student_billing_config").upsert({
    id: 1,
    nequi_number: strOrNull(formData, "nequi_number")?.slice(0, 30) ?? null,
    wompi_link: strOrNull(formData, "wompi_link")?.slice(0, 300) ?? null,
    reminder_days: Number.isFinite(days) ? Math.min(Math.max(days, 0), 30) : 3,
    days_before: Number.isFinite(before) ? Math.min(Math.max(before, 1), 10) : 1,
    auto_whatsapp: formData.get("auto_whatsapp") === "on",
    template_manual: strOrNull(formData, "template_manual")?.slice(0, 1500) ?? null,
    template_overdue: strOrNull(formData, "template_overdue")?.slice(0, 1500) ?? null,
    template_auto_failed: strOrNull(formData, "template_auto_failed")?.slice(0, 1500) ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) msg(BASE, "error", error.message);
  refresh();
  msg(BASE, "ok", "Datos de cobro guardados.");
}

// ------------------------------------------------------------------ importar
export interface ImportResult {
  added?: number;
  linked?: number;
  skipped?: string[];
  error?: string;
}

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Una línea por alumno, separada por comas, punto y coma o tabulaciones (se puede pegar desde Excel o Google Sheets):
 * nombre, correo, whatsapp, programa, plataforma, valor, moneda, pagado hasta
 */
export async function importStudents(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const { supabase } = await requireAdmin();
  const defaultProgram: Program = str(formData, "default_program") === "acompanamiento" ? "acompanamiento" : "membresia";
  const lines = str(formData, "rows").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Pega al menos una línea." };
  if (lines.length > 500) return { error: "Máximo 500 alumnos por vez." };

  const { data: profiles } = await createAdminClient().from("profiles").select("id, email");
  const userByEmail = new Map((profiles ?? []).map((p) => [String(p.email).toLowerCase(), p.id as string]));

  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  lines.forEach((line, i) => {
    const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const cols = line.split(sep).map((c) => c.trim());
    const [name, email, phone, program, platform, amount, currency, paidUntil] = cols;
    // Saltar la fila de títulos si la copiaron.
    if (i === 0 && /nombre/i.test(name ?? "")) return;
    if (!name) return void skipped.push(`Línea ${i + 1}: falta el nombre`);

    const plat = norm(platform ?? "");
    const p: Platform = PLATFORM_KEYS.find((k) => plat.includes(k)) ?? "otro";
    const cur: Currency = /usd|dolar|us\$/i.test(currency ?? "") || (!currency && (p === "whop" || p === "skool")) ? "USD" : "COP";
    const amt = amount ? parseAmount(amount, cur) : 0;
    const prog = norm(program ?? "");
    const mail = email && email.includes("@") ? email.toLowerCase() : null;
    const wa = (phone ?? "").replace(/\D/g, "");
    const until = paidUntil ? parseDate(paidUntil) : null;
    if (paidUntil && !until) skipped.push(`Línea ${i + 1} (${name}): no entendí la fecha «${paidUntil}», quedó sin fecha`);

    rows.push({
      full_name: name.slice(0, 120),
      email: mail,
      whatsapp: /^[0-9]{8,15}$/.test(wa) ? wa : null,
      program: prog.startsWith("acomp") || prog.includes("mentor") || prog.includes("1") ? "acompanamiento" : prog.startsWith("memb") ? "membresia" : defaultProgram,
      platform: p,
      auto_renew: PLATFORMS[p].auto,
      amount: Number.isFinite(amt) && amt >= 0 ? amt : 0,
      currency: cur,
      interval_days: 30,
      paid_until: until,
      user_id: mail ? (userByEmail.get(mail) ?? null) : null,
    });
  });

  if (rows.length === 0) return { error: "No encontré alumnos en lo que pegaste.", skipped };
  const { error } = await supabase.from("student_enrollments").insert(rows);
  if (error) return { error: error.message, skipped };
  refresh();
  return { added: rows.length, linked: rows.filter((r) => r.user_id).length, skipped };
}

/**
 * «Mensajes de hoy»: Cowork (o tú) marca cada recordatorio como enviado por WhatsApp o Skool.
 * Queda en el registro (no se vuelve a pedir) y en el seguimiento del alumno.
 */
export async function markSent(formData: FormData) {
  const { user } = await requireAdmin();
  const id = str(formData, "enrollment_id");
  const stage = ["antes", "hoy", "vencido"].includes(str(formData, "stage")) ? str(formData, "stage") : "antes";
  const due = parseDate(str(formData, "due_date"));
  const channel = str(formData, "channel") === "skool" ? "Skool" : "WhatsApp";
  if (!id || !due) return;
  const admin = createAdminClient();
  const { data: prev } = await admin.from("student_reminders_log").select("status, detail")
    .eq("enrollment_id", id).eq("stage", stage).eq("due_date", due).maybeSingle();
  const detail = prev?.status === "enviado" && prev.detail && !prev.detail.includes(channel) ? `${prev.detail} + ${channel}` : channel;
  await admin.from("student_reminders_log").upsert({ enrollment_id: id, stage, due_date: due, status: "enviado", detail });
  await admin.from("student_enrollments").update({ last_reminder_at: new Date().toISOString() }).eq("id", id);
  const when = stage === "antes" ? "antes del pago" : stage === "hoy" ? "el día del pago" : "pago atrasado";
  await admin.from("student_followups").insert({ enrollment_id: id, kind: "recordatorio", note: `Recordatorio (${when}) enviado por ${channel}.`, created_by: user.id });
  revalidatePath(`${BASE}/hoy`);
  refresh(id);
}
