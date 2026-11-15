// Cliente mínimo de Wompi (Colombia) para suscripciones con Nequi y tarjeta.
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

export const publicKey = () => env("WOMPI_PUBLIC_KEY");

export async function createPaymentSource(token: string, email: string, type: "NEQUI" | "CARD" = "NEQUI") {
  const acc = await acceptanceTokens();
  const d = await call("/payment_sources", {
    method: "POST",
    key: "private",
    body: { type, token, customer_email: email, ...acc },
  });
  return String(d.id);
}

export type BrowserInfo = {
  browser_color_depth: string; browser_screen_height: string; browser_screen_width: string;
  browser_language: string; browser_user_agent: string; browser_tz: string;
};

/** Primer pago con tarjeta usando 3D Secure (el banco puede pedirle al alumno que confirme). */
export async function createCard3dsTransaction(args: {
  reference: string; amountCop: number; email: string; cardToken: string;
  fullName: string; phone: string; browserInfo: BrowserInfo;
}) {
  const amount = args.amountCop * 100;
  const acc = await acceptanceTokens();
  const signature = await sha256Hex(`${args.reference}${amount}COP${env("WOMPI_INTEGRITY_SECRET")}`);
  const sandbox = !env("WOMPI_PUBLIC_KEY").startsWith("pub_prod_");
  const d = await call("/transactions", {
    method: "POST",
    key: "private",
    body: {
      acceptance_token: acc.acceptance_token,
      accept_personal_auth: acc.accept_personal_auth,
      amount_in_cents: amount,
      currency: "COP",
      signature,
      customer_email: args.email,
      reference: args.reference,
      payment_method: { type: "CARD", token: args.cardToken, installments: 1 },
      is_three_ds: true,
      ...(sandbox ? { three_ds_auth_type: "challenge_v2" } : {}),
      customer_data: { full_name: args.fullName, phone_number: args.phone, browser_info: args.browserInfo },
    },
  });
  return { id: String(d.id), status: d.status as string, message: (d.status_message ?? null) as string | null };
}

/** Estado de una transacción incluyendo el paso de 3D Secure (para mostrar el reto del banco). */
export async function getTransactionDetail(id: string) {
  const d = await call(`/transactions/${id}`);
  const auth = d?.payment_method?.extra?.three_ds_auth ?? null;
  return {
    id: String(d.id),
    status: d.status as string,
    message: (d.status_message ?? null) as string | null,
    reference: d.reference as string,
    three_ds: auth
      ? { step: auth.current_step ?? null, step_status: auth.current_step_status ?? null, html: auth.three_ds_method_data ?? null }
      : null,
  };
}

export async function getTransaction(id: string) {
  const d = await call(`/transactions/${id}`);
  return { id: String(d.id), status: d.status as string, message: (d.status_message ?? null) as string | null, reference: d.reference as string };
}

const FINAL = ["APPROVED", "DECLINED", "VOIDED", "ERROR"];

/** Crea el registro del cobro, lanza la transacción en Wompi y aplica el resultado si ya es final. */
export async function chargeSubscription(
  db: SupabaseClient,
  sub: { id: string; user_id: string; customer_email: string; payment_source_id: string; payment_method?: string | null },
  priceCop: number,
) {
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
        // Las tarjetas exigen el número de cuotas; los cobros recurrentes van siempre a 1 cuota.
        ...(sub.payment_method === "CARD" ? { payment_method: { installments: 1 } } : {}),
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

/**
 * Tarjetas: el primer pago se hace con 3D Secure usando un token de un solo uso. Cuando ese pago queda
 * APPROVED se crea la fuente de pago (con el segundo token) para los cobros mensuales. Usa el mismo
 * «candado» que Nequi para que la página, el webhook y el cron no la creen dos veces.
 */
async function ensureCardSource(db: SupabaseClient, reference: string) {
  const { data: pay } = await db.from("subscription_payments").select("subscription_id").eq("reference", reference).maybeSingle();
  if (!pay) return;
  const { data: claimed } = await db
    .from("subscriptions")
    .update({ payment_source_id: "creando", updated_at: new Date().toISOString() })
    .eq("id", pay.subscription_id)
    .eq("payment_method", "CARD")
    .is("payment_source_id", null)
    .not("pending_card_token", "is", null)
    .select("id, customer_email, pending_card_token")
    .maybeSingle();
  if (!claimed) return;
  try {
    const sourceId = await createPaymentSource(claimed.pending_card_token!, claimed.customer_email, "CARD");
    await db.from("subscriptions").update({ payment_source_id: sourceId, pending_card_token: null }).eq("id", claimed.id);
  } catch (e) {
    console.error("fuente tarjeta", (e as Error).message);
    await db.from("subscriptions").update({
      payment_source_id: null, pending_card_token: null,
      last_error: "Pago recibido, pero el banco no permitió guardar la tarjeta para cobros automáticos",
    }).eq("id", claimed.id);
  }
}

export async function applyPayment(db: SupabaseClient, reference: string, status: string, txId: string | null, message: string | null) {
  if (status === "APPROVED") await ensureCardSource(db, reference);
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
