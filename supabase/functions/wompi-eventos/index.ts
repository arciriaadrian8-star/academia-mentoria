// Webhook de Wompi. Configura esta URL en Wompi > Desarrolladores > URL de eventos:
//   https://<proyecto>.supabase.co/functions/v1/wompi-eventos
// Se verifica la firma con WOMPI_EVENTS_SECRET y, por seguridad, el estado se vuelve a consultar en Wompi.
import { adminClient, applyPayment, finalizeSubscription, getNequiTokenStatus, getTransaction, json, sha256Hex } from "../_shared/wompi.ts";

const pick = (obj: any, path: string) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

async function validSignature(evt: any) {
  const secret = (Deno.env.get("WOMPI_EVENTS_SECRET") ?? "").trim();
  const props: string[] = evt?.signature?.properties ?? [];
  if (!secret || !props.length || !evt?.signature?.checksum) return false;
  const concat = props.map((p) => String(pick(evt.data, p) ?? "")).join("") + String(evt.timestamp ?? "") + secret;
  return (await sha256Hex(concat)).toLowerCase() === String(evt.signature.checksum).toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  let evt: any;
  try { evt = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  if (!(await validSignature(evt))) return json({ error: "Firma inválida" }, 401);

  const db = adminClient();
  try {
    if (evt.event === "transaction.updated") {
      const t = evt.data?.transaction;
      if (!t?.reference?.startsWith("MEM-")) return json({ ok: true, ignored: true }); // otros pagos de Wompi
      const tx = await getTransaction(String(t.id));
      const { data: pay } = await db.from("subscription_payments").select("reference").eq("reference", tx.reference).maybeSingle();
      if (pay) await applyPayment(db, tx.reference, tx.status, tx.id, tx.message);
      return json({ ok: true });
    }

    if (evt.event === "nequi_token.updated") {
      const tokenId = evt.data?.nequi_token?.id ?? evt.data?.token?.id ?? evt.data?.id;
      if (!tokenId) return json({ ok: true });
      const { data: sub } = await db.from("subscriptions").select("id, status").eq("nequi_token", tokenId).eq("status", "pendiente").maybeSingle();
      if (!sub) return json({ ok: true });
      const status = await getNequiTokenStatus(tokenId);
      if (status === "APPROVED") await finalizeSubscription(db, sub.id);
      else if (status === "DECLINED") await db.from("subscriptions").update({ status: "fallida", last_error: "Rechazó la autorización en Nequi" }).eq("id", sub.id);
      return json({ ok: true });
    }

    return json({ ok: true, ignored: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Error procesando el evento" }, 500); // Wompi reintenta
  }
});
