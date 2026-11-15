// Suscripción con Nequi desde la página /membresia. POST con el JWT del alumno.
//   { action: "iniciar", plan_id, phone }  → pide a Nequi la autorización de débito automático
//   { action: "estado" }                   → revisa si ya aprobó en Nequi y, si sí, hace el primer cobro
//   { action: "reactivar" }                → deshace una cancelación antes de que termine el periodo
//   { action: "config" }                   → llave pública de Wompi (para tokenizar la tarjeta en el navegador)
//   { action: "iniciar_tarjeta", plan_id, card_token, brand, last4 } → guarda la tarjeta y hace el primer cobro
import {
  adminClient, chargeSubscription, cors, createNequiToken, createPaymentSource, finalizeSubscription, getNequiTokenStatus, json,
  publicKey, syncPendingPayments, wompiConfigured,
} from "../_shared/wompi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!wompiConfigured()) return json({ error: "Los pagos con Nequi aún no están activos. Escríbele a tu mentor." }, 503);

  const db = adminClient();
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return json({ error: "Inicia sesión para suscribirte." }, 401);

  let body: { action?: string; plan_id?: string; phone?: string; card_token?: string; brand?: string; last4?: string } = {};
  try { body = await req.json(); } catch { /* vacío */ }

  try {
    if (body.action === "config") return json({ public_key: publicKey() });

    if (body.action === "iniciar_tarjeta") {
      const cardToken = String(body.card_token ?? "");
      if (!/^tok_(prod|test)_/.test(cardToken)) return json({ error: "No pudimos leer tu tarjeta. Revisa los datos." }, 400);
      const { data: plan } = await db.from("membership_plans").select("id, active, price_cop").eq("id", body.plan_id ?? "").maybeSingle();
      if (!plan?.active) return json({ error: "Ese plan no está disponible." }, 400);

      const { data: live } = await db.from("subscriptions").select("id, status, cancel_at_period_end")
        .eq("user_id", user.id).in("status", ["pendiente", "activa", "en_mora"]).maybeSingle();
      if (live?.status === "pendiente") {
        await db.from("subscriptions").update({ status: "fallida", last_error: "Reemplazada por un nuevo intento" }).eq("id", live.id).is("payment_source_id", null);
      } else if (live) {
        return json({ error: live.cancel_at_period_end ? "Tu membresía sigue activa hasta fin de mes. Puedes reactivarla." : "Ya tienes una membresía activa." }, 409);
      }

      let sourceId: string;
      try {
        sourceId = await createPaymentSource(cardToken, user.email!, "CARD");
      } catch (e) {
        console.error(e);
        return json({ error: "Tu banco no aceptó registrar la tarjeta para cobros automáticos. Prueba con otra tarjeta." }, 402);
      }
      const last4 = /^\d{4}$/.test(String(body.last4 ?? "")) ? String(body.last4) : null;
      const { data: sub, error } = await db.from("subscriptions").insert({
        user_id: user.id, plan_id: plan.id, customer_email: user.email, payment_method: "CARD",
        card_brand: String(body.brand ?? "").slice(0, 30) || null, card_last4: last4, payment_source_id: sourceId,
      }).select("id, user_id, customer_email, payment_source_id, payment_method").single();
      if (error) throw error;
      const charge = await chargeSubscription(db, sub, plan.price_cop);
      const { data: fresh } = await db.from("subscriptions").select("status, last_error").eq("id", sub.id).single();
      return json({ ...fresh, charge_status: charge.status });
    }

    if (body.action === "iniciar") {
      const phone = String(body.phone ?? "").replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
      if (!/^3\d{9}$/.test(phone)) return json({ error: "Escribe tu número Nequi de 10 dígitos (empieza por 3)." }, 400);

      const { data: plan } = await db.from("membership_plans").select("id, active").eq("id", body.plan_id ?? "").maybeSingle();
      if (!plan?.active) return json({ error: "Ese plan no está disponible." }, 400);

      const { data: live } = await db.from("subscriptions").select("id, status, cancel_at_period_end")
        .eq("user_id", user.id).in("status", ["pendiente", "activa", "en_mora"]).maybeSingle();
      if (live?.status === "pendiente") {
        // Intento anterior sin terminar: se descarta y se empieza de nuevo.
        await db.from("subscriptions").update({ status: "fallida", last_error: "Reemplazada por un nuevo intento" }).eq("id", live.id).is("payment_source_id", null);
      } else if (live) {
        return json({ error: live.cancel_at_period_end ? "Tu membresía sigue activa hasta fin de mes. Puedes reactivarla." : "Ya tienes una membresía activa." }, 409);
      }

      const token = await createNequiToken(phone);
      const { data: sub, error } = await db.from("subscriptions").insert({
        user_id: user.id, plan_id: plan.id, customer_email: user.email, phone_last4: phone.slice(-4), nequi_token: token.id,
      }).select("id").single();
      if (error) throw error;
      return json({ ok: true, subscription_id: sub.id, status: "pendiente" });
    }

    if (body.action === "estado") {
      const { data: sub } = await db.from("subscriptions").select("id, status, nequi_token, payment_source_id, last_error")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!sub) return json({ status: "ninguna" });

      if (sub.status === "pendiente" && !sub.payment_source_id && sub.nequi_token) {
        const tokenStatus = await getNequiTokenStatus(sub.nequi_token);
        if (tokenStatus === "APPROVED") await finalizeSubscription(db, sub.id);
        else if (tokenStatus === "DECLINED") {
          await db.from("subscriptions").update({ status: "fallida", last_error: "Rechazaste la autorización en Nequi" }).eq("id", sub.id);
        }
      }
      await syncPendingPayments(db, { subscriptionId: sub.id });

      const { data: fresh } = await db.from("subscriptions").select("status, last_error, current_period_end").eq("id", sub.id).single();
      return json(fresh);
    }

    if (body.action === "reactivar") {
      const { data: sub } = await db.from("subscriptions").select("id, current_period_end")
        .eq("user_id", user.id).in("status", ["activa", "en_mora"]).eq("cancel_at_period_end", true).maybeSingle();
      if (!sub) return json({ error: "No hay nada que reactivar." }, 400);
      await db.from("subscriptions").update({
        cancel_at_period_end: false, canceled_at: null, next_charge_at: sub.current_period_end, updated_at: new Date().toISOString(),
      }).eq("id", sub.id);
      return json({ ok: true });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "No pudimos conectar con Nequi. Intenta de nuevo en unos minutos." }, 502);
  }
});
