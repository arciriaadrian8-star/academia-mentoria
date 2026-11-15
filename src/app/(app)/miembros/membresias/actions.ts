"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { MAKEDROP } from "@/lib/makedrop";
import { INTERVALS } from "@/lib/membership";
import { str, strOrNull } from "@/lib/utils";

const PAGE = "/miembros/membresias";
const back = (params: string) => redirect(`${PAGE}?${params}`);
const money = (v: string) => parseInt(v.replace(/\D/g, ""), 10);

function refresh() {
  revalidatePath(PAGE);
  revalidatePath("/membresia");
}

function planFields(formData: FormData) {
  const name = str(formData, "name").slice(0, 80);
  const price = money(str(formData, "price_cop"));
  const days = parseInt(str(formData, "interval_days"), 10);
  const whatsapp = str(formData, "contact_whatsapp").replace(/\D/g, "");
  const compare = money(str(formData, "compare_price_cop"));
  return {
    // Precio normal tachado: solo se guarda si es mayor que el precio real (ahí sale «Cupón aplicado»).
    compare_price_cop: Number.isFinite(compare) && compare > price && compare <= 50000000 ? compare : null,
    name,
    price_cop: price,
    description: strOrNull(formData, "description")?.slice(0, 500) ?? null,
    interval_days: INTERVALS.some((i) => i.days === days) ? days : 30,
    // MakeDrop IA: quien paga solo recibe acceso al Kit COD, nunca a los cursos de la academia.
    grants_role: "kit" as const,
    skool_url: strOrNull(formData, "skool_url")?.slice(0, 300) ?? MAKEDROP.skoolUrl,
    contact_whatsapp: /^[0-9]{8,15}$/.test(whatsapp) ? whatsapp : MAKEDROP.whatsapp,
  };
}

export async function createPlan(formData: FormData) {
  const { supabase } = await requireAdmin();
  const fields = planFields(formData);
  if (fields.name.length < 2 || !Number.isFinite(fields.price_cop) || fields.price_cop < 1500) {
    back("error=" + encodeURIComponent("Escribe un nombre y un precio de al menos $1.500"));
  }
  const { error } = await supabase.from("membership_plans").insert(fields);
  if (error) back("error=" + encodeURIComponent(error.message));
  refresh();
  back("ok=" + encodeURIComponent("Plan creado. Ya aparece en la página de pago."));
}

export async function updatePlan(formData: FormData) {
  const { supabase } = await requireAdmin();
  const fields = planFields(formData);
  if (fields.name.length < 2 || !Number.isFinite(fields.price_cop) || fields.price_cop < 1500) {
    back("error=" + encodeURIComponent("Escribe un nombre y un precio de al menos $1.500"));
  }
  const { error } = await supabase.from("membership_plans").update(fields).eq("id", str(formData, "id"));
  if (error) back("error=" + encodeURIComponent(error.message));
  refresh();
  back("ok=" + encodeURIComponent("Plan actualizado. El nuevo precio aplica desde el próximo cobro de cada alumno."));
}

export async function togglePlan(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("membership_plans").update({ active: str(formData, "active") === "true" }).eq("id", str(formData, "id"));
  refresh();
}

export async function cancelSubscription(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("cancel_subscription", { p_id: str(formData, "id") });
  refresh();
}

export async function createCode(formData: FormData) {
  const { supabase } = await requireAdmin();
  const code = str(formData, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  const kind = str(formData, "kind") === "fixed" ? "fixed" : "percent";
  const value = money(str(formData, "value"));
  const duration = ["first", "months", "forever"].includes(str(formData, "duration")) ? str(formData, "duration") : "first";
  const months = parseInt(str(formData, "duration_months"), 10);
  const max = parseInt(str(formData, "max_redemptions"), 10);
  const expires = str(formData, "expires_at");
  const planId = str(formData, "plan_id");

  if (code.length < 3) back("error=" + encodeURIComponent("El código debe tener al menos 3 letras o números."));
  if (!Number.isFinite(value) || value < 1) back("error=" + encodeURIComponent("Escribe el valor del descuento."));
  if (kind === "percent" && value > 99) back("error=" + encodeURIComponent("El porcentaje máximo es 99%."));
  if (duration === "months" && !(months >= 1 && months <= 36)) back("error=" + encodeURIComponent("Escribe por cuántos cobros aplica (1 a 36)."));

  const { error } = await supabase.from("discount_codes").insert({
    code,
    kind,
    value,
    duration,
    duration_months: duration === "months" ? months : null,
    max_redemptions: Number.isFinite(max) && max > 0 ? max : null,
    // Vence al final del día elegido, hora Colombia.
    expires_at: expires ? `${expires}T23:59:59-05:00` : null,
    plan_id: planId || null,
    description: strOrNull(formData, "description")?.slice(0, 200) ?? null,
  });
  if (error) back("error=" + encodeURIComponent(error.code === "23505" ? "Ya existe un código con ese nombre." : error.message));
  refresh();
  back("ok=" + encodeURIComponent(`Código ${code} creado.`));
}

export async function toggleCode(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("discount_codes").update({ active: str(formData, "active") === "true" }).eq("code", str(formData, "code"));
  refresh();
}

export async function deleteCode(formData: FormData) {
  const { supabase } = await requireAdmin();
  // Solo se borran los que nadie ha usado; los usados se desactivan para conservar el historial.
  await supabase.from("discount_codes").delete().eq("code", str(formData, "code")).eq("redemptions", 0);
  refresh();
}
