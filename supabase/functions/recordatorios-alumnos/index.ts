// Recordatorios automáticos de pago para los alumnos que NO tienen cobro automático (Nequi, Wompi, otro).
// Lo llama pg_cron una vez al día (ver upgrade-15-recordatorios-whatsapp.sql) con el header x-cron-secret.
//
// Envía por la API oficial de WhatsApp Business (Meta Cloud API) una plantilla aprobada:
//   - «antes»:   N días antes de la fecha de pago (por defecto 1 día antes)
//   - «hoy»:     el día del pago, si aún no ha pagado
//   - «vencido»: 2 días después, si sigue sin pagar
// Cada recordatorio se manda UNA sola vez por alumno, etapa y fecha de pago (tabla student_reminders_log).
//
// Secretos (Supabase > Edge Functions > Secrets):
//   WHATSAPP_TOKEN            token permanente de la app de Meta (usuario del sistema)
//   WHATSAPP_PHONE_ID         «Phone number ID» del número de WhatsApp Business
//   WHATSAPP_TEMPLATE         nombre de la plantilla aprobada (ej.: recordatorio_pago)
//   WHATSAPP_TEMPLATE_LANG    idioma de la plantilla (por defecto «es»)
//   WHATSAPP_TEMPLATE_VENCIDO (opcional) otra plantilla para cuando ya venció
// La plantilla debe tener 5 variables en el cuerpo: {{1}} nombre, {{2}} programa, {{3}} fecha, {{4}} valor, {{5}} cómo pagar.
import { adminClient, json } from "../_shared/wompi.ts";

type Stage = "antes" | "hoy" | "vencido";

const TZ = "America/Bogota";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fmtMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", { style: "currency", currency, maximumFractionDigits: currency === "COP" ? 0 : 2 }).format(amount);
const waNumber = (raw: string | null) => {
  const n = (raw ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(n)) return `57${n}`;
  return n.length >= 8 ? n : null;
};

async function sendTemplate(to: string, template: string, params: string[]) {
  const token = Deno.env.get("WHATSAPP_TOKEN")!;
  const phoneId = Deno.env.get("WHATSAPP_PHONE_ID")!;
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "es" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) }],
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return String(body?.messages?.[0]?.id ?? "");
}

Deno.serve(async (req) => {
  const db = adminClient();
  let secret = (Deno.env.get("CRON_SECRET") ?? "").trim();
  if (!secret) {
    const { data } = await db.rpc("cron_secret_cobros");
    secret = String(data ?? "");
  }
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "No autorizado" }, 401);

  const configured = Boolean(Deno.env.get("WHATSAPP_TOKEN") && Deno.env.get("WHATSAPP_PHONE_ID") && Deno.env.get("WHATSAPP_TEMPLATE"));
  const { data: cfg } = await db.from("student_billing_config").select("*").eq("id", 1).maybeSingle();
  if (cfg && cfg.auto_whatsapp === false) return json({ ok: true, skipped: "Envío automático desactivado en el panel" });

  const t = today();
  const daysBefore = Math.max(1, Number(cfg?.days_before ?? 1));
  const stages: [Stage, string][] = [
    ["antes", addDays(t, daysBefore)],
    ["hoy", t],
    ["vencido", addDays(t, -2)],
  ];
  const howToPay = [cfg?.nequi_number && `Nequi ${cfg.nequi_number}`, cfg?.wompi_link && `Wompi ${cfg.wompi_link}`].filter(Boolean).join(" o ") ||
    "el medio de pago de siempre";

  const results = { sent: 0, failed: 0, sin_whatsapp: 0, ya_enviado: 0 };
  for (const [stage, due] of stages) {
    const { data: rows } = await db
      .from("student_enrollments")
      .select("id, full_name, whatsapp, program, plan_name, amount, currency, paid_until")
      .eq("status", "activo")
      .eq("auto_renew", false)
      .not("interval_days", "is", null)
      .eq("paid_until", due)
      .limit(500);

    for (const e of rows ?? []) {
      // Reservar el envío: si ya existe (otra corrida), no se repite.
      const { error: dup } = await db.from("student_reminders_log")
        .insert({ enrollment_id: e.id, stage, due_date: due, status: "enviando" });
      if (dup) { results.ya_enviado++; continue; }

      const to = waNumber(e.whatsapp);
      let status = "enviado";
      let detail: string | null = null;
      if (!configured) {
        status = "sin_configurar";
        detail = "Falta configurar la API de WhatsApp Business";
      } else if (!to) {
        status = "sin_whatsapp";
        detail = "El alumno no tiene WhatsApp en su ficha";
        results.sin_whatsapp++;
      } else {
        try {
          const template = stage === "vencido" && Deno.env.get("WHATSAPP_TEMPLATE_VENCIDO") ? Deno.env.get("WHATSAPP_TEMPLATE_VENCIDO")! : Deno.env.get("WHATSAPP_TEMPLATE")!;
          detail = await sendTemplate(to, template, [
            e.full_name.trim().split(/\s+/)[0] ?? e.full_name,
            e.plan_name || (e.program === "acompanamiento" ? "acompañamiento" : "membresía"),
            fmtDay(due),
            fmtMoney(Number(e.amount), e.currency),
            howToPay,
          ]);
          results.sent++;
        } catch (err) {
          status = "fallido";
          detail = (err as Error).message.slice(0, 500);
          results.failed++;
        }
      }
      await db.from("student_reminders_log").update({ status, detail }).eq("enrollment_id", e.id).eq("stage", stage).eq("due_date", due);
      if (status === "enviado") {
        await db.from("student_enrollments").update({ last_reminder_at: new Date().toISOString() }).eq("id", e.id);
        await db.from("student_followups").insert({
          enrollment_id: e.id,
          kind: "recordatorio",
          note: `Recordatorio automático por WhatsApp (${stage === "antes" ? `${daysBefore} día(s) antes` : stage === "hoy" ? "el día del pago" : "2 días de atraso"}).`,
        });
      }
    }
  }
  return json({ ok: true, configured, date: t, ...results });
});
