// Cobro automático de las membresías. Lo llama pg_cron (ver upgrade-06-cron-cobros.sql) con
// el header x-cron-secret (guardado en Vault como «cron_secret_cobros», o en el secreto CRON_SECRET).
//  1. Revisa en Wompi los cobros que quedaron PENDING.
//  2. Cobra las suscripciones cuya fecha de cobro ya llegó (y reintenta las que están en mora).
//  3. Vence las que pasaron el periodo + 3 días de gracia sin pagar.
import { adminClient, chargeSubscription, json, syncPendingPayments, wompiConfigured } from "../_shared/wompi.ts";

Deno.serve(async (req) => {
  const db = adminClient();
  let secret = (Deno.env.get("CRON_SECRET") ?? "").trim();
  if (!secret) {
    const { data } = await db.rpc("cron_secret_cobros");
    secret = String(data ?? "");
  }
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "No autorizado" }, 401);
  if (!wompiConfigured()) return json({ error: "Wompi no configurado" }, 503);

  await syncPendingPayments(db, { olderThanMinutes: 5 });

  const { data: due } = await db
    .from("subscriptions")
    .select("id, user_id, customer_email, payment_source_id, payment_method, failed_attempts")
    .in("status", ["activa", "en_mora"])
    .eq("cancel_at_period_end", false)
    .lte("next_charge_at", new Date().toISOString())
    .lt("failed_attempts", 3)
    .not("payment_source_id", "is", null)
    .limit(200);

  let charged = 0;
  for (const s of due ?? []) {
    if (s.payment_source_id === "creando") continue;
    // No cobrar dos veces si ya hay un cobro en curso de las últimas 24 h.
    const { count } = await db.from("subscription_payments").select("id", { count: "exact", head: true })
      .eq("subscription_id", s.id).eq("status", "PENDING").gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
    if (count) continue;
    try {
      await chargeSubscription(db, s as any);
      charged++;
    } catch (e) {
      console.error("cobro", s.id, (e as Error).message);
    }
  }

  const { data: expired } = await db.rpc("expire_subscriptions");
  return json({ ok: true, charged, expired });
});
