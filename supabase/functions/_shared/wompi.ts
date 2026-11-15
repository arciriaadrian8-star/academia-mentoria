// Cliente mínimo de Wompi (Colombia) para suscripciones con Nequi.
// Flujo: token Nequi (el alumno aprueba en su app) → fuente de pago → transacciones recurrentes.
// Secretos (Supabase > Edge Functions > Secrets):
//   WOMPI_PUBLIC_KEY (pub_prod_… o pub_test_…), WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => (Deno.env.get(k) ?? "").trim();

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const adminClient = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

export const wompiConfigured = () =>
  Boolean(env("WOMPI_PUBLIC_KEY") && env("WOMPI_PRIVATE_KEY") && env("WOMPI_INTEGRITY_SECRET"));

const base = () =>
  env("WOMPI_PUBLIC_KEY").startsWith("pub_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";

export class WompiError extends Error {}

async function call(path: string, opts: { method?: string; body?: unknown; key?: "public" | "private" } = {}) {
  const key = opts.key === "private" ? env("WOMPI_PRIVATE_KEY") : env("WOMPI_PUBLIC_KEY");
  const res = await fetch(`${base()}${path}`, {
    method: opts.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* respuesta no JSON */ }
  if (!res.ok) {
    const err = data?.error;
    const detail = err?.messages ? JSON.stringify(err.messages) : err?.reason ?? err?.type ?? text.slice(0, 200);
    throw new WompiError(`Wompi ${res.status}: ${detail}`);
  }
  return data?.data;
}

export async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function acceptanceTokens() {
  const m = await call(`/merchants/${env("WOMPI_PUBLIC_KEY")}`);
  return {
    acceptance_token: m?.presigned_acceptance?.acceptance_token as string,
    accept_personal_auth: m?.presigned_personal_data_auth?.acceptance_token as string,
  };
}

export async function createNequiToken(phone: string) {
  const d = await call("/tokens/nequi", { method: "POST", body: { phone_number: phone } });
  return { id: d.id as string, status: d.status as string };
}

export async function getNequiTokenStatus(token: string) {
  const d = await call(`/tokens/nequi/${token}`);
  return d?.status as string; // PENDING | APPROVED | DECLINED
}

async function createPaymentSource(token: string, email: string) {
  const acc = await acceptanceTokens();
  const d = await call("/payment_sources", {
    method: "POST",
    key: "private",
    body: { type: "NEQUI", token, customer_email: email, ...acc },
  });
  return String(d.id);
}

export async function getTransaction(id: string) {
  const d = await call(`/transactions/${id}`);
  return { id: String(d.id), status: d.status as string, message: (d.status_message ?? null) as string | null, reference: d.reference as string };
}

const FINAL = ["APPROVED", "DECLINED", "VOIDED", "ERROR"];

/** Crea el registro del cobro, lanza la transacción en Wompi y aplica el resultado si ya es final. */
export async function chargeSubscription(db: SupabaseClient, sub: { id: string; user_id: string; customer_email: string; payment_source_id: string }, priceCop: number) {
  const reference = `MEM-${sub.id.slice(0, 8)}-${Date.now()}`;
  const amount = priceCop * 100;
  const { error } = await db.from("subscription_payments").insert({
    subscription_id: sub.id, user_id: sub.user_id, reference, amount_cop: priceCop,
  });
  if (error) throw error;

  try {
    const signature = await sha256Hex(`${reference}${amount}COP${env("WOMPI_INTEGRITY_SECRET")}`);
    const tx = await call("/transactions", {
      method: "POST",
      key: "private",
      body: {
        amount_in_cents: amount,
        currency: "COP",
        signature,
        customer_email: sub.customer_email,
        reference,
        payment_source_id: Number(sub.payment_source_id),
      },
    });
    await db.from("subscription_payments").update({ wompi_transaction_id: String(tx.id) }).eq("reference", reference);
    if (FINAL.includes(tx.status)) await applyPayment(db, reference, tx.status, String(tx.id), tx.status_message ?? null);
    return { reference, status: tx.status as string };
  } catch (e) {
    await applyPayment(db, reference, "ERROR", null, String((e as Error).message));
    return { reference, status: "ERROR" };
  }
}

export async function applyPayment(db: SupabaseClient, reference: string, status: string, txId: string | null, message: string | null) {
  const { data, error } = await db.rpc("apply_subscription_payment", {
    p_reference: reference, p_status: status, p_transaction_id: txId, p_message: message,
  });
  if (error) throw error;
  return data as string;
}

/** Revisa en Wompi los cobros que siguen PENDING y aplica su estado final. */
export async function syncPendingPayments(db: SupabaseClient, filter: { subscriptionId?: string; olderThanMinutes?: number } = {}) {
  let q = db.from("subscription_payments").select("reference, wompi_transaction_id, created_at").eq("status", "PENDING").not("wompi_transaction_id", "is", null).limit(100);
  if (filter.subscriptionId) q = q.eq("subscription_id", filter.subscriptionId);
  if (filter.olderThanMinutes) q = q.lt("created_at", new Date(Date.now() - filter.olderThanMinutes * 60_000).toISOString());
  const { data } = await q;
  for (const p of data ?? []) {
    try {
      const tx = await getTransaction(p.wompi_transaction_id!);
      if (FINAL.includes(tx.status)) await applyPayment(db, p.reference, tx.status, tx.id, tx.message);
    } catch (e) {
      console.error("sync", p.reference, (e as Error).message);
    }
  }
}

/**
 * Cuando el alumno aprobó en Nequi: crea la fuente de pago y hace el primer cobro.
 * Usa un «candado» (payment_source_id = 'creando') para que el webhook y la página no cobren dos veces.
 */
export async function finalizeSubscription(db: SupabaseClient, subscriptionId: string) {
  const { data: claimed } = await db
    .from("subscriptions")
    .update({ payment_source_id: "creando", updated_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("status", "pendiente")
    .is("payment_source_id", null)
    .select("id, user_id, customer_email, nequi_token, plan_id")
    .maybeSingle();
  if (!claimed) return; // otro proceso ya lo está haciendo, o ya se hizo

  let sourceId: string;
  try {
    sourceId = await createPaymentSource(claimed.nequi_token!, claimed.customer_email);
  } catch (e) {
    await db.from("subscriptions").update({ payment_source_id: null, last_error: String((e as Error).message).slice(0, 500) }).eq("id", claimed.id);
    throw e;
  }
  await db.from("subscriptions").update({ payment_source_id: sourceId }).eq("id", claimed.id);
  const { data: plan } = await db.from("membership_plans").select("price_cop").eq("id", claimed.plan_id).single();
  await chargeSubscription(db, { ...claimed, payment_source_id: sourceId }, plan!.price_cop);
}
