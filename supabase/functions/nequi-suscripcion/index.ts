// Pagos de la membresía (MakeDrop IA) desde la página /membresia. No exige iniciar sesión:
// si no hay sesión, la cuenta «Solo Kit» se crea sola con el correo y la página sigue el pago con un
// checkout_token secreto que se devuelve al iniciar.
//   { action: "config" }                                   → llave pública de Wompi (tokenizar la tarjeta en el navegador)
//   { action: "validar_codigo", plan_id, discount_code }   → revisa un código de descuento y devuelve el precio final
//   { action: "iniciar", plan_id, phone, [customer_email, full_name], [discount_code] } → autorización Nequi
//   { action: "iniciar_tarjeta", plan_id, card_token, source_token, ... }               → primer cobro con 3D Secure
//   { action: "estado", [checkout_token] }                 → revisa Nequi / cobros y devuelve el estado
//   { action: "estado_tarjeta", transaction_id, [checkout_token] } → estado del primer cobro y reto 3D Secure
//   { action: "skool_email", email, [checkout_token] }     → guarda el correo de Skool para que el admin lo invite
//   { action: "reactivar" }                                → deshace una cancelación (requiere sesión)
import {
  adminClient, applyPayment, chargeAmount, checkDiscount, cors, createCard3dsTransaction, createNequiToken, finalizeSubscription,
  getNequiTokenStatus, getTransactionDetail, json, publicKey, syncPendingPayments, wompiConfigured,
} from "../_shared/wompi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!wompiConfigured()) return json({ error: "Los pagos con Nequi aún no están activos. Escríbele a tu mentor." }, 503);

  const db = adminClient();
  let body: {
    action?: string; plan_id?: string; phone?: string; card_token?: string; source_token?: string; brand?: string; last4?: string;
    full_name?: string; transaction_id?: string; browser_info?: Record<string, unknown>; discount_code?: string; email?: string;
    customer_email?: string; checkout_token?: string;
  } = {};
  try { body = await req.json(); } catch { /* vacío */ }

  try {
    if (body.action === "config") return json({ public_key: publicKey() });

    if (body.action === "validar_codigo") {
      const r = await checkDiscount(db, String(body.discount_code ?? ""), String(body.plan_id ?? ""));
      return r.valid ? json(r) : json({ error: r.error }, 400);
    }

    // ¿Quién paga? 1) sesión iniciada, 2) token del pago en curso, 3) invitado nuevo (solo al iniciar).
    let user: { id: string; email: string } | null = null;
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jwt.split(".").length === 3) {
      const { data: auth } = await db.auth.getUser(jwt);
      if (auth?.user?.email) user = { id: auth.user.id, email: auth.user.email };
    }
    const checkoutToken = String(body.checkout_token ?? "");
    let guestSubId: string | null = null;
    if (!user && /^[a-f0-9-]{36,80}$/.test(checkoutToken)) {
      const { data: s } = await db.from("subscriptions").select("id, user_id, customer_email").eq("checkout_token", checkoutToken).maybeSingle();
      if (s) { user = { id: s.user_id, email: s.customer_email }; guestSubId = s.id; }
    }
    let newCheckoutToken: string | null = null;
    if (!user && (body.action === "iniciar" || body.action === "iniciar_tarjeta")) {
      const guest = await findOrCreateGuest(db, String(body.customer_email ?? ""), String(body.full_name ?? ""));
      if ("error" in guest) return json({ error: guest.error }, 400);
      user = guest;
      newCheckoutToken = `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, "")}`;
    }
    if (!user) return json({ error: "Tu sesión de pago expiró. Recarga la página." }, 401);

    if (body.action === "skool_email") {
      const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Escribe un correo válido." }, 400);
      let q = db.from("subscriptions").select("id").eq("user_id", user.id).in("status", ["activa", "en_mora", "pendiente"]);
      if (guestSubId) q = q.eq("id", guestSubId);
      const { data: sub } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!sub) return json({ error: "No encontramos tu membresía." }, 404);
      await db.from("subscriptions").update({ skool_email: email }).eq("id", sub.id);
      return json({ ok: true });
    }

    // Código de descuento (opcional) para iniciar / iniciar_tarjeta: se valida aquí y se copia a la suscripción.
    let discountFields: Record<string, unknown> = {};
    if ((body.action === "iniciar" || body.action === "iniciar_tarjeta") && String(body.discount_code ?? "").trim()) {
      const r = await checkDiscount(db, String(body.discount_code), String(body.plan_id ?? ""));
      if (!r.valid) return json({ error: r.error }, 400);
      discountFields = { discount_code: r.code, discount_kind: r.kind, discount_value: r.value, discount_remaining: r.remaining };
    }

    if (body.action === "iniciar_tarjeta") {
      // card_token: se usa en el primer pago con 3D Secure. source_token: se guarda para los cobros mensuales.
      const cardToken = String(body.card_token ?? "");
      const sourceToken = String(body.source_token ?? "");
      if (!/^tok_(prod|test)_/.test(cardToken) || !/^tok_(prod|test)_/.test(sourceToken)) {
        return json({ error: "No pudimos leer tu tarjeta. Revisa los datos." }, 400);
      }
      const fullName = String(body.full_name ?? "").trim().slice(0, 80);
      const phone = String(body.phone ?? "").replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
      if (fullName.length < 5) return json({ error: "Escribe tu nombre completo." }, 400);
      if (phone.length < 7 || phone.length > 15) return json({ error: "Escribe tu número de celular." }, 400);
      const bi = body.browser_info ?? {};
      const browserInfo = {
        browser_color_depth: String(bi.browser_color_depth ?? "24").slice(0, 4),
        browser_screen_height: String(bi.browser_screen_height ?? "800").slice(0, 6),
        browser_screen_width: String(bi.browser_screen_width ?? "1280").slice(0, 6),
        browser_language: String(bi.browser_language ?? "es-CO").slice(0, 20),
        browser_user_agent: String(bi.browser_user_agent ?? req.headers.get("user-agent") ?? "").slice(0, 500),
        browser_tz: String(bi.browser_tz ?? "300").slice(0, 6),
      };

      const { data: plan } = await db.from("membership_plans").select("id, active, price_cop").eq("id", body.plan_id ?? "").maybeSingle();
      if (!plan?.active) return json({ error: "Ese plan no está disponible." }, 400);

      const { data: live } = await db.from("subscriptions").select("id, status, cancel_at_period_end")
        .eq("user_id", user.id).in("status", ["pendiente", "activa", "en_mora"]).maybeSingle();
      if (live?.status === "pendiente") {
        await db.from("subscriptions").update({ status: "fallida", last_error: "Reemplazada por un nuevo intento", pending_card_token: null })
          .eq("id", live.id).or("payment_source_id.is.null,payment_method.eq.CARD");
      } else if (live) {
        return json({ error: live.cancel_at_period_end ? "Tu membresía sigue activa hasta fin de mes. Puedes reactivarla." : "Ya tienes una membresía activa." }, 409);
      }

      const last4 = /^\d{4}$/.test(String(body.last4 ?? "")) ? String(body.last4) : null;
      const { data: sub, error } = await db.from("subscriptions").insert({
        user_id: user.id, plan_id: plan.id, customer_email: user.email, payment_method: "CARD",
        card_brand: String(body.brand ?? "").slice(0, 30) || null, card_last4: last4, pending_card_token: sourceToken,
        checkout_token: newCheckoutToken, ...discountFields,
      }).select("id").single();
      if (error) throw error;

      const amountCop = await chargeAmount(db, sub.id);
      const reference = `MEM-${sub.id.slice(0, 8)}-${Date.now()}`;
      await db.from("subscription_payments").insert({ subscription_id: sub.id, user_id: user.id, reference, amount_cop: amountCop });
      try {
        const tx = await createCard3dsTransaction({
          reference, amountCop, email: user.email!, cardToken, fullName, phone, browserInfo,
        });
        await db.from("subscription_payments").update({ wompi_transaction_id: tx.id }).eq("reference", reference);
        if (["APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(tx.status)) await applyPayment(db, reference, tx.status, tx.id, tx.message);
        return json({ ok: true, transaction_id: tx.id, status: tx.status, checkout_token: newCheckoutToken });
      } catch (e) {
        console.error(e);
        await applyPayment(db, reference, "ERROR", null, String((e as Error).message));
        return json({ error: "Tu banco no aceptó el pago. Prueba con otra tarjeta." }, 402);
      }
    }

    if (body.action === "estado_tarjeta") {
      // Devuelve el estado del primer pago y, si el banco pide verificación, el HTML del reto 3D Secure.
      const { data: pay } = await db.from("subscription_payments").select("reference, wompi_transaction_id, user_id, status")
        .eq("wompi_transaction_id", String(body.transaction_id ?? "")).maybeSingle();
      if (!pay || pay.user_id !== user.id) return json({ error: "Pago no encontrado." }, 404);
      const tx = await getTransactionDetail(pay.wompi_transaction_id!);
      if (["APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(tx.status)) await applyPayment(db, pay.reference, tx.status, tx.id, tx.message);
      return json({ status: tx.status, message: tx.message, three_ds: tx.three_ds });
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
        checkout_token: newCheckoutToken, ...discountFields,
      }).select("id").single();
      if (error) throw error;
      return json({ ok: true, subscription_id: sub.id, status: "pendiente", checkout_token: newCheckoutToken });
    }

    if (body.action === "estado") {
      let q = db.from("subscriptions").select("id, status, nequi_token, payment_source_id, last_error").eq("user_id", user.id);
      if (guestSubId) q = q.eq("id", guestSubId);
      const { data: sub } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
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
      if (guestSubId) return json({ error: "Inicia sesión para reactivar tu membresía." }, 401);
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

/**
 * Pago sin cuenta: busca al usuario por correo o crea una cuenta «Solo Kit» sin acceso
 * (el acceso al Kit COD se activa cuando se aprueba el pago). Nunca cambia cuentas que ya existían.
 */
async function findOrCreateGuest(db: ReturnType<typeof adminClient>, rawEmail: string, rawName: string) {
  const email = rawEmail.trim().toLowerCase().slice(0, 200);
  const fullName = rawName.trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo válido." };
  if (fullName.length < 3) return { error: "Escribe tu nombre completo." };

  const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { id: existing.id as string, email };

  const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data.user) {
    console.error("crear invitado", error?.message);
    return { error: "No pudimos registrar tu correo. Intenta de nuevo." };
  }
  await db.from("profiles").update({ full_name: fullName, role: "kit", active: false, pending: false }).eq("id", data.user.id);
  return { id: data.user.id, email };
}
