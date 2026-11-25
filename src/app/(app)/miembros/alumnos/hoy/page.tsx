import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_CONFIG, DEFAULT_TEMPLATES, PLATFORMS, PROGRAMS, addDays, fillTemplate, formatDay, formatMoney, todayISO, waNumber, whatsappLink,
  type BillingConfig, type Enrollment, type ReminderLog,
} from "@/lib/students";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { markSent } from "../actions";

type Stage = ReminderLog["stage"];

/** +57 300 123 4567 */
function prettyPhone(raw: string | null) {
  const n = waNumber(raw);
  if (!n) return null;
  if (n.startsWith("57") && n.length === 12) return `+57 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  return `+${n}`;
}

/**
 * Lista de recordatorios del día pensada para Cowork: datos exactos (nombre, número, valor, fecha) y el
 * mensaje listo. Cowork lo envía desde tu WhatsApp (o Skool) y pulsa «Marcar enviado».
 */
export default async function TodayMessagesPage() {
  const { supabase } = await requireAdmin();
  const today = todayISO();
  const [{ data: rows, error }, { data: cfgRow }] = await Promise.all([
    supabase.from("student_enrollments").select("*").eq("status", "activo").eq("auto_renew", false).not("interval_days", "is", null).order("full_name"),
    supabase.from("student_billing_config").select("*").eq("id", 1).maybeSingle(),
  ]);
  const cfg: BillingConfig = { ...DEFAULT_CONFIG, ...(cfgRow ?? {}) };
  const manual = (rows ?? []) as Enrollment[];

  const stages: { stage: Stage; due: string; title: string; template: string }[] = [
    { stage: "antes", due: addDays(today, cfg.days_before), title: cfg.days_before === 1 ? "Pagan mañana" : `Pagan en ${cfg.days_before} días`, template: cfg.template_manual || DEFAULT_TEMPLATES.manual },
    { stage: "hoy", due: today, title: "Pagan hoy (aún sin pago registrado)", template: cfg.template_manual || DEFAULT_TEMPLATES.manual },
    { stage: "vencido", due: addDays(today, -2), title: "Atrasados 2 días (aún sin pago registrado)", template: cfg.template_overdue || DEFAULT_TEMPLATES.overdue },
  ];
  const dueDates = stages.map((s) => s.due);
  const { data: logRows } = await supabase.from("student_reminders_log").select("*").in("due_date", dueDates);
  const logs = (logRows ?? []) as ReminderLog[];
  const sentOf = (id: string, stage: Stage, due: string) => logs.find((l) => l.enrollment_id === id && l.stage === stage && l.due_date === due && l.status === "enviado");

  const groups = stages.map((s) => ({ ...s, people: manual.filter((e) => e.paid_until === s.due) }));
  const pending = groups.reduce((n, g) => n + g.people.filter((e) => !sentOf(e.id, g.stage, g.due)).length, 0);
  const incomplete = manual.filter((e) => !waNumber(e.whatsapp) || !(e.amount > 0) || !e.paid_until);
  let n = 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/miembros/alumnos" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Control de alumnos
      </Link>
      <h1 className="text-2xl font-bold">Mensajes de hoy · {formatDay(today)}</h1>
      <p id="resumen" className="mt-1 mb-4 text-sm text-zinc-600">
        Pendientes por enviar: <b data-pendientes={pending}>{pending}</b>. Solo alumnos de pago manual (Nequi, Wompi y otros); Whop y Skool cobran solos.
      </p>
      {error && <div className="mb-4"><FormMessage error="Falta aplicar la actualización de la base de datos (upgrade-14 y upgrade-15)." /></div>}

      <details className="card mb-6 p-4 text-sm">
        <summary className="cursor-pointer font-semibold"><Bot className="mr-1 inline size-4" /> Instrucciones para Cowork</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-700">
          <li>Para cada alumno con estado «Pendiente», abre su chat con el botón «Abrir chat de WhatsApp» (o en WhatsApp Web busca el número exacto que aparece).</li>
          <li>Pega el «Mensaje a enviar» tal cual (sin cambiar valor, fecha ni número de Nequi) y envíalo.</li>
          <li>Vuelve aquí y pulsa «Marcar enviado por WhatsApp». Si también está en Skool, envíale el mismo mensaje por chat de Skool (búscalo por su nombre o correo) y pulsa «Marcar enviado por Skool».</li>
          <li>No envíes nada a los que ya dicen «Enviado». Si un número no existe en WhatsApp, no lo marques y anótalo al final.</li>
        </ol>
      </details>

      {groups.map((g) => (
        <section key={g.stage} className="mb-8">
          <h2 className="mb-3 text-lg font-bold">{g.title} · fecha de pago {formatDay(g.due)} ({g.people.length})</h2>
          {g.people.length === 0 ? (
            <p className="card p-4 text-sm text-zinc-500">Nadie.</p>
          ) : (
            <ol className="space-y-3">
              {g.people.map((e) => {
                n++;
                const sent = sentOf(e.id, g.stage, g.due);
                const message = fillTemplate(g.template, e, cfg);
                const wa = whatsappLink(e.whatsapp, message);
                const phone = prettyPhone(e.whatsapp);
                return (
                  <li key={e.id} data-alumno={e.full_name} data-estado={sent ? "enviado" : "pendiente"} className={cn("card p-4 text-sm", sent && "opacity-60")}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-bold">#{n} · {e.full_name}</span>
                      <span className={cn("chip", sent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                        {sent ? <><CheckCircle2 className="mr-1 inline size-3.5" />Enviado ({sent.detail})</> : "Pendiente"}
                      </span>
                    </div>
                    <dl className="mb-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      <div><dt className="inline text-zinc-500">WhatsApp: </dt><dd className="inline font-mono font-semibold">{phone ?? "⚠️ sin número"}</dd></div>
                      <div><dt className="inline text-zinc-500">Correo: </dt><dd className="inline">{e.email ?? "—"}</dd></div>
                      <div><dt className="inline text-zinc-500">Valor a pagar: </dt><dd className="inline font-semibold">{formatMoney(e.amount, e.currency)}</dd></div>
                      <div><dt className="inline text-zinc-500">Fecha de pago: </dt><dd className="inline font-semibold">{formatDay(e.paid_until)}</dd></div>
                      <div><dt className="inline text-zinc-500">Programa: </dt><dd className="inline">{e.plan_name || PROGRAMS[e.program]}</dd></div>
                      <div><dt className="inline text-zinc-500">Paga por: </dt><dd className="inline">{PLATFORMS[e.platform].label}</dd></div>
                    </dl>
                    <p className="mb-1 text-xs font-semibold text-zinc-500">Mensaje a enviar:</p>
                    <pre className="mb-3 rounded-lg bg-zinc-50 p-3 font-sans text-sm whitespace-pre-wrap">{message}</pre>
                    <div className="flex flex-wrap gap-2">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700">
                          <MessageCircle className="size-3.5" /> Abrir chat de WhatsApp
                        </a>
                      )}
                      <CopyButton text={message} label="Copiar mensaje" />
                      {(["whatsapp", "skool"] as const).map((channel) => (
                        <form key={channel} action={markSent}>
                          <input type="hidden" name="enrollment_id" value={e.id} />
                          <input type="hidden" name="stage" value={g.stage} />
                          <input type="hidden" name="due_date" value={g.due} />
                          <input type="hidden" name="channel" value={channel} />
                          <SubmitButton className="btn-sm" pendingText="Guardando...">
                            Marcar enviado por {channel === "whatsapp" ? "WhatsApp" : "Skool"}
                          </SubmitButton>
                        </form>
                      ))}
                      <Link href={`/miembros/alumnos/${e.id}`} className="btn btn-secondary btn-sm">Ficha</Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-bold">Datos por completar ({incomplete.length})</h2>
        <p className="mb-3 text-sm text-zinc-500">Alumnos de pago manual sin WhatsApp, sin valor o sin fecha de pago: no se les puede recordar hasta completarlos.</p>
        {incomplete.length === 0 ? (
          <p className="card p-4 text-sm text-emerald-700">✅ Todos tienen número, valor y fecha.</p>
        ) : (
          <ul className="card divide-y divide-zinc-100">
            {incomplete.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Link href={`/miembros/alumnos/${e.id}`} className="flex-1 font-semibold hover:underline">{e.full_name}</Link>
                <span className="text-xs text-red-700">
                  {[!waNumber(e.whatsapp) && "falta WhatsApp", !(e.amount > 0) && "falta valor", !e.paid_until && "falta fecha de pago"].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
