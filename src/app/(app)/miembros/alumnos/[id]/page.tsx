import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, NotebookPen, Receipt, Trash2, UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CONFIG, ENROLLMENT_STATUS, PLATFORMS, PROGRAMS, fillTemplate, formatDay, formatMoney, payState, payStateLabel, reminderTemplate,
  studentIntervalLabel, suggestCoversUntil, todayISO, whatsappLink, waNumber,
  type BillingConfig, type Enrollment, type Followup, type StudentPayment,
} from "@/lib/students";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addFollowup, deleteEnrollment, deleteFollowup, deletePayment, registerPayment, saveEnrollment, setAccountAccess, unlinkAccount,
} from "../actions";
import { EnrollmentFields } from "../EnrollmentFields";
import { ReminderButton } from "../ReminderButton";

const KIND_LABEL: Record<Followup["kind"], string> = { sesion: "🎯 Sesión", nota: "📝 Nota", recordatorio: "💬 Recordatorio" };

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin();
  const today = todayISO();

  const [{ data: row }, { data: payRows }, { data: fuRows }, { data: cfgRow }] = await Promise.all([
    supabase.from("student_enrollments").select("*").eq("id", id).maybeSingle(),
    supabase.from("student_payments").select("*").eq("enrollment_id", id).order("paid_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("student_followups").select("*").eq("enrollment_id", id).order("happened_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("student_billing_config").select("*").eq("id", 1).maybeSingle(),
  ]);
  const e = row as Enrollment | null;
  if (!e) notFound();
  const payments = (payRows ?? []) as StudentPayment[];
  const followups = (fuRows ?? []) as Followup[];
  const cfg: BillingConfig = { ...DEFAULT_CONFIG, ...(cfgRow ?? {}) };

  const { data: account } = e.user_id
    ? await createAdminClient().from("profiles").select("id, full_name, email, role, active, access_until").eq("id", e.user_id).maybeSingle()
    : { data: null };

  const state = payState(e, today, cfg.reminder_days);
  const st = e.status === "activo" ? payStateLabel(state, e, today) : ENROLLMENT_STATUS[e.status];
  const sessionsDone = followups.filter((f) => f.kind === "sesion").length;
  const suggested = suggestCoversUntil(e, today);
  const wa = waNumber(e.whatsapp);
  const totalPaid = payments.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.currency]: (acc[p.currency] ?? 0) + Number(p.amount) }), {});

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/miembros/alumnos" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Control de alumnos
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{e.full_name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{e.plan_name || PROGRAMS[e.program]}</span>
            <span className={cn("chip", PLATFORMS[e.platform].className)}>{PLATFORMS[e.platform].label} · {e.auto_renew ? "automático" : "manual"}</span>
            <span>{formatMoney(e.amount, e.currency)} {studentIntervalLabel(e.interval_days)}</span>
            <span className={cn("chip", st.className)}>{st.label}</span>
          </p>
        </div>
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
        {e.status === "activo" && e.interval_days && (
          <ReminderButton
            id={e.id}
            href={whatsappLink(e.whatsapp, fillTemplate(reminderTemplate(e, state, cfg), e, cfg))}
            label={e.auto_renew ? "Avisar que falló el cobro" : "Enviar recordatorio de pago"}
          />
        )}
      </div>

      {ok && <div className="mb-4"><FormMessage success={ok} /></div>}
      {error && <div className="mb-4"><FormMessage error={error} /></div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-zinc-500">Pagado hasta</p><p className="text-lg font-bold">{formatDay(e.paid_until)}</p></div>
        <div className="card p-4"><p className="text-xs text-zinc-500">Con nosotros desde</p><p className="text-lg font-bold">{formatDay(e.start_date)}</p></div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Total pagado</p>
          <p className="text-lg font-bold">{Object.entries(totalPaid).map(([c, v]) => formatMoney(v, c as "COP" | "USD")).join(" + ") || "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Sesiones</p>
          <p className="text-lg font-bold">{sessionsDone}{e.sessions_included ? ` de ${e.sessions_included}` : ""}</p>
          {e.end_date && <p className="text-xs text-zinc-500">Termina {formatDay(e.end_date)}</p>}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* -------------------------------------------------- registrar pago */}
          <section className="card p-6">
            <h2 className="mb-1 flex items-center gap-2 font-semibold"><Receipt className="size-4" /> Registrar pago</h2>
            <p className="mb-4 text-xs text-zinc-500">
              {e.auto_renew
                ? `Cuando veas en ${PLATFORMS[e.platform].label} que el cobro pasó, regístralo aquí para correr la fecha.`
                : "Cuando te llegue el comprobante de Nequi o Wompi, regístralo aquí."}
              {account && " Al registrarlo se le activa el acceso a la academia."}
            </p>
            <form action={registerPayment} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="enrollment_id" value={e.id} />
              <div>
                <label className="label" htmlFor="pay-amount">Valor</label>
                <div className="flex gap-2">
                  <input id="pay-amount" name="amount" inputMode="decimal" defaultValue={e.amount || ""} className="input" />
                  <select name="currency" defaultValue={e.currency} className="input w-24" aria-label="Moneda">
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="pay-platform">Por</label>
                <select id="pay-platform" name="platform" defaultValue={e.platform} className="input">
                  {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="pay-date">Fecha del pago</label>
                <input id="pay-date" name="paid_at" type="date" defaultValue={today} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="pay-covers">Queda al día hasta</label>
                <input id="pay-covers" name="covers_until" type="date" defaultValue={suggested ?? ""} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="pay-ref">Referencia o nota (opcional)</label>
                <input id="pay-ref" name="reference" maxLength={120} placeholder="Nº de comprobante, últimos dígitos…" className="input" />
              </div>
              <div className="sm:col-span-2"><SubmitButton pendingText="Registrando...">Registrar pago</SubmitButton></div>
            </form>
          </section>

          {/* ------------------------------------------------------ historial */}
          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Historial de pagos</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-zinc-500">Aún no hay pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <span className="w-28 text-zinc-500">{formatDay(p.paid_at)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{formatMoney(Number(p.amount), p.currency)}</span>
                      <span className="text-xs text-zinc-500"> · {PLATFORMS[p.platform].label}{p.covers_until && ` · hasta ${formatDay(p.covers_until)}`}{p.reference && ` · ${p.reference}`}</span>
                    </span>
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="enrollment_id" value={e.id} />
                      <ConfirmButton message="¿Borrar este pago?" className="btn-sm" aria-label="Borrar pago"><Trash2 className="size-3.5" /></ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ----------------------------------------------------- seguimiento */}
          <section className="card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><NotebookPen className="size-4" /> Seguimiento del {PROGRAMS[e.program].toLowerCase()}</h2>
            <form action={addFollowup} className="mb-4 space-y-3">
              <input type="hidden" name="enrollment_id" value={e.id} />
              <div className="flex gap-2">
                <select name="kind" defaultValue={e.program === "acompanamiento" ? "sesion" : "nota"} className="input w-auto" aria-label="Tipo">
                  <option value="sesion">Sesión</option>
                  <option value="nota">Nota</option>
                </select>
                <input name="happened_at" type="date" defaultValue={today} className="input w-auto" aria-label="Fecha" />
              </div>
              <textarea name="note" rows={3} maxLength={2000} required placeholder="Qué vieron, tareas que quedaron, resultados, próximos pasos…" className="input" />
              <SubmitButton pendingText="Guardando...">Guardar</SubmitButton>
            </form>
            {followups.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin registros todavía.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {followups.map((f) => (
                  <li key={f.id} className="rounded-lg bg-zinc-50 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-700">{KIND_LABEL[f.kind]}</span>
                      <span>{formatDay(f.happened_at)}</span>
                      <form action={deleteFollowup} className="ml-auto">
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="enrollment_id" value={e.id} />
                        <button className="text-zinc-400 hover:text-red-600" aria-label="Borrar"><Trash2 className="size-3.5" /></button>
                      </form>
                    </div>
                    <p className="whitespace-pre-wrap">{f.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* --------------------------------------------------------- cuenta */}
          <section className="card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><UserRound className="size-4" /> Cuenta en la academia</h2>
            {account ? (
              <div className="space-y-3 text-sm">
                <p>
                  <Link href={`/miembros/${account.id}`} className="font-semibold hover:underline">{account.full_name || account.email}</Link>
                  <span className="text-zinc-500"> · {account.email}</span>
                </p>
                <p>
                  <span className={cn("chip", account.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>{account.active ? "Con acceso" : "Sin acceso"}</span>
                  {account.role === "kit" && account.access_until && <span className="ml-2 text-xs text-zinc-500">Kit hasta {formatDay(account.access_until.slice(0, 10))}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {account.role !== "admin" && account.role !== "coach" && (
                    <form action={setAccountAccess}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="user_id" value={account.id} />
                      <input type="hidden" name="active" value={String(!account.active)} />
                      {account.active ? (
                        <ConfirmButton message={`¿Quitarle el acceso a ${e.full_name}?`} className="btn-sm">Quitar acceso</ConfirmButton>
                      ) : (
                        <button className="btn btn-primary btn-sm">Dar acceso</button>
                      )}
                    </form>
                  )}
                  <form action={unlinkAccount}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn btn-secondary btn-sm">Desligar</button>
                  </form>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No tiene cuenta ligada. Si se registra en la academia con <b>{e.email ?? "su correo"}</b>, guarda esta ficha de nuevo y se liga sola.
              </p>
            )}
          </section>

          {/* ---------------------------------------------------------- datos */}
          <form action={saveEnrollment} className="card space-y-5 p-6">
            <h2 className="font-semibold">Datos del alumno</h2>
            <input type="hidden" name="id" value={e.id} />
            {e.user_id && <input type="hidden" name="user_id" value={e.user_id} />}
            <EnrollmentFields e={e} />
            <SubmitButton pendingText="Guardando...">Guardar cambios</SubmitButton>
          </form>

          <form action={deleteEnrollment} className="card flex items-center justify-between gap-3 p-6">
            <input type="hidden" name="id" value={e.id} />
            <p className="text-sm text-zinc-500">Sacarlo del control (borra sus pagos y seguimiento; su cuenta de la academia no se toca).</p>
            <ConfirmButton message={`¿Eliminar a ${e.full_name} del control de alumnos?`}><Trash2 className="size-4" /> Eliminar</ConfirmButton>
          </form>
        </div>
      </div>
    </div>
  );
}
