import Link from "next/link";
import { AlertTriangle, ArrowLeft, BellRing, Check, GraduationCap, Plus, RefreshCw, Search, Settings2, Target, Upload, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CONFIG, DEFAULT_TEMPLATES, ENROLLMENT_STATUS, RENEWAL_GOAL, REMINDER_STATUS, addDays, renewalStats, PLATFORMS, PROGRAMS, daysBetween, fillTemplate, formatDay, formatMoney, monthlyAmount,
  payState, payStateLabel, reminderTemplate, studentIntervalLabel, todayISO, whatsappLink,
  type BillingConfig, type Currency, type ReminderLog, type Enrollment, type PayState, type Platform, type Program, type StudentPayment,
} from "@/lib/students";
import { cn, timeAgo } from "@/lib/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { registerPayment, saveBillingConfig, setAccountAccess } from "./actions";
import { ReminderButton } from "./ReminderButton";

type Search = { ok?: string; error?: string; q?: string; programa?: string; plataforma?: string; cobro?: string; estado?: string };

const money = (totals: Record<Currency, number>) =>
  (["COP", "USD"] as Currency[]).filter((c) => totals[c] > 0).map((c) => formatMoney(totals[c], c)).join(" + ") || formatMoney(0, "COP");

export default async function StudentsControlPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [{ data: rows, error: tableError }, { data: payRows }, { data: cfgRow }, { data: logRows }] = await Promise.all([
    supabase.from("student_enrollments").select("*").order("full_name"),
    supabase.from("student_payments").select("*").gte("paid_at", monthStart),
    supabase.from("student_billing_config").select("*").eq("id", 1).maybeSingle(),
    supabase.from("student_reminders_log").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const logs = (logRows ?? []) as ReminderLog[];
  const all = (rows ?? []) as Enrollment[];
  const monthPayments = (payRows ?? []) as StudentPayment[];
  const cfg: BillingConfig = { ...DEFAULT_CONFIG, ...(cfgRow ?? {}) };

  const linkedIds = [...new Set(all.map((e) => e.user_id).filter(Boolean))] as string[];
  const { data: profRows } = linkedIds.length
    ? await createAdminClient().from("profiles").select("id, active, role").in("id", linkedIds)
    : { data: [] as { id: string; active: boolean; role: string }[] };
  const profileOf = (id: string | null) => profRows?.find((p) => p.id === id);

  const withState = all.map((e) => ({ e, state: payState(e, today, cfg.reminder_days) }));
  const active = withState.filter((x) => x.e.status === "activo");

  // ------------------------------------------------------------- métricas
  const countProgram = (p: Program) => active.filter((x) => x.e.program === p).length;
  const mrr: Record<Currency, number> = { COP: 0, USD: 0 };
  active.forEach(({ e }) => (mrr[e.currency] += monthlyAmount(e)));
  const collected: Record<Currency, number> = { COP: 0, USD: 0 };
  monthPayments.forEach((p) => (collected[p.currency] += Number(p.amount)));
  const overdue = active.filter((x) => x.state === "vencido");
  const byPlatform = (Object.keys(PLATFORMS) as Platform[]).map((p) => ({ p, n: active.filter((x) => x.e.platform === p).length }));

  // Renovación del mes: meta del 80 %.
  const renewalAll = renewalStats(all, monthPayments, today);
  const renewalManual = renewalStats(all, monthPayments, today, (e) => !e.auto_renew);

  // Recordatorio de mañana (o N días antes): alumnos manuales cuya fecha de pago es esa.
  const reminderDate = addDays(today, cfg.days_before);
  const upcomingReminders = active.filter((x) => !x.e.auto_renew && x.e.interval_days && x.e.paid_until === reminderDate);
  const logOf = (id: string, due: string | null) => logs.find((l) => l.enrollment_id === id && l.due_date === due);
  const lastRun = logs[0]?.created_at;
  const preMessage = (e: Enrollment) => fillTemplate(cfg.template_manual || DEFAULT_TEMPLATES.manual, e, cfg);

  // Para cobrar: manuales vencidos o por vencer. Para revisar: automáticos cuya fecha ya pasó.
  const sortByDate = (a: { e: Enrollment }, b: { e: Enrollment }) => (a.e.paid_until ?? "").localeCompare(b.e.paid_until ?? "");
  const toCollect = active.filter((x) => !x.e.auto_renew && (x.state === "vencido" || x.state === "por_vencer" || x.state === "sin_fecha")).sort(sortByDate);
  const toVerify = active.filter((x) => x.e.auto_renew && x.state === "vencido").sort(sortByDate);

  // --------------------------------------------------------------- filtros
  let list = withState;
  const estado = sp.estado ?? "activos";
  if (estado === "activos") list = list.filter((x) => x.e.status === "activo");
  else if (estado === "inactivos") list = list.filter((x) => x.e.status !== "activo");
  else if (estado !== "todos") list = list.filter((x) => x.state === (estado as PayState));
  if (sp.programa) list = list.filter((x) => x.e.program === sp.programa);
  if (sp.plataforma) list = list.filter((x) => x.e.platform === sp.plataforma);
  if (sp.cobro === "auto") list = list.filter((x) => x.e.auto_renew);
  if (sp.cobro === "manual") list = list.filter((x) => !x.e.auto_renew);
  if (sp.q) {
    const t = sp.q.toLowerCase();
    list = list.filter((x) => `${x.e.full_name} ${x.e.email ?? ""} ${x.e.whatsapp ?? ""} ${x.e.plan_name ?? ""}`.toLowerCase().includes(t));
  }
  const filterHref = (extra: Partial<Search>) => {
    const params = new URLSearchParams();
    const merged = { q: sp.q, programa: sp.programa, plataforma: sp.plataforma, cobro: sp.cobro, estado: sp.estado, ...extra };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    return `/miembros/alumnos?${params.toString()}#lista`;
  };

  const reminder = (e: Enrollment, state: PayState) => whatsappLink(e.whatsapp, fillTemplate(reminderTemplate(e, state, cfg), e, cfg));

  const QuickPaid = ({ e, label }: { e: Enrollment; label: string }) => (
    <form action={registerPayment}>
      <input type="hidden" name="enrollment_id" value={e.id} />
      <input type="hidden" name="back" value="list" />
      <ConfirmButton
        message={`¿Registrar el pago de ${e.full_name} por ${formatMoney(e.amount, e.currency)} con fecha de hoy?`}
        className="btn-sm bg-zinc-900 text-white hover:bg-zinc-700"
      >
        <Check className="size-3.5" /> {label}
      </ConfirmButton>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/miembros" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Miembros
      </Link>
      <PageHeader
        title="Control de alumnos"
        description="Acompañamiento y membresías en un solo lugar: Nequi y Wompi (les cobras tú) y Whop y Skool (se cobran solos)."
      >
        <Link href="/miembros/alumnos/hoy" className="btn btn-secondary"><BellRing className="size-4" /> Mensajes de hoy (Cowork)</Link>
        <Link href="/miembros/alumnos/importar" className="btn btn-secondary"><Upload className="size-4" /> Importar</Link>
        <Link href="/miembros/alumnos/nuevo" className="btn btn-primary"><Plus className="size-4" /> Agregar alumno</Link>
      </PageHeader>

      {tableError && <div className="mb-6"><FormMessage error="Falta aplicar la actualización de la base de datos (supabase/upgrade-14-control-alumnos.sql)." /></div>}
      {sp.ok && <div className="mb-4"><FormMessage success={sp.ok} /></div>}
      {sp.error && <div className="mb-4"><FormMessage error={sp.error} /></div>}

      {/* --------------------------------------------------------- métricas */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Link href={filterHref({ programa: "acompanamiento", estado: "activos" })} className="card p-4 hover:border-brand">
          <p className="text-xs text-zinc-500">Acompañamiento activos</p><p className="text-2xl font-bold">{countProgram("acompanamiento")}</p>
        </Link>
        <Link href={filterHref({ programa: "membresia", estado: "activos" })} className="card p-4 hover:border-brand">
          <p className="text-xs text-zinc-500">Membresía activos</p><p className="text-2xl font-bold">{countProgram("membresia")}</p>
        </Link>
        <div className="card p-4"><p className="text-xs text-zinc-500">Ingreso mensual esperado</p><p className="text-lg font-bold">{money(mrr)}</p></div>
        <div className="card p-4"><p className="text-xs text-zinc-500">Registrado este mes</p><p className="text-lg font-bold">{money(collected)}</p></div>
        <Link href={filterHref({ estado: "vencido" })} className={cn("card p-4 hover:border-brand", overdue.length > 0 && "border-red-200 bg-red-50")}>
          <p className="text-xs text-zinc-500">Vencidos</p><p className={cn("text-2xl font-bold", overdue.length > 0 && "text-red-700")}>{overdue.length}</p>
        </Link>
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {byPlatform.map(({ p, n }) => (
          <Link key={p} href={filterHref({ plataforma: sp.plataforma === p ? undefined : p })} className={cn("chip", PLATFORMS[p].className, sp.plataforma === p && "ring-2 ring-zinc-900")}>
            {PLATFORMS[p].label}: {n} {PLATFORMS[p].auto ? "· automático" : "· manual"}
          </Link>
        ))}
      </div>


      {/* ---------------------------------------------------- meta 80 % */}
      <div className="card mb-8 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Target className="size-5 text-brand" />
          <h2 className="text-lg font-bold">Renovación de este mes</h2>
          <span className="text-sm text-zinc-500">Meta: {RENEWAL_GOAL} % o más</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([["Todos los alumnos", renewalAll], ["Pago manual (Nequi / Wompi)", renewalManual]] as const).map(([label, r]) => (
            <div key={label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className={cn("text-xl font-bold", r.rate === null ? "text-zinc-400" : r.rate >= RENEWAL_GOAL ? "text-emerald-700" : "text-red-700")}>
                  {r.rate === null ? "—" : `${r.rate} %`}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-zinc-100">
                <div className={cn("h-full rounded-full", (r.rate ?? 0) >= RENEWAL_GOAL ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${r.rate ?? 0}%` }} />
                <div className="absolute top-0 h-full w-0.5 bg-zinc-900" style={{ left: `${RENEWAL_GOAL}%` }} title={`Meta ${RENEWAL_GOAL} %`} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {r.total === 0 ? "Aún no le ha tocado pagar a nadie este mes." : `${r.renewed} renovaron · ${r.lost} vencidos sin pagar`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --------------------------------------------- recordatorios de mañana */}
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><BellRing className="size-5 text-emerald-600" /> Recordatorios: pagan {cfg.days_before === 1 ? "mañana" : `en ${cfg.days_before} días`} ({formatDay(reminderDate)})</h2>
      <p className="mb-3 text-sm text-zinc-500">
        {cfg.auto_whatsapp
          ? "Les llega un WhatsApp automático por la API de WhatsApp Business a las 9 a.m."
          : <>Cowork se los envía desde tu WhatsApp con la página <Link href="/miembros/alumnos/hoy" className="text-brand underline">Mensajes de hoy</Link> (ahí están el número, el valor y el mensaje exacto de cada uno).</>}
        {lastRun && <> Último recordatorio registrado: {timeAgo(lastRun)}.</>}
      </p>
      {upcomingReminders.length === 0 ? (
        <p className="card mb-8 p-4 text-sm text-zinc-500">Nadie con pago manual {cfg.days_before === 1 ? "mañana" : "ese día"}.</p>
      ) : (
        <ul className="card mb-8 divide-y divide-zinc-100">
          {upcomingReminders.map(({ e, state }) => {
            const log = logOf(e.id, e.paid_until);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-48 flex-1">
                  <Link href={`/miembros/alumnos/${e.id}`} className="font-semibold hover:underline">{e.full_name}</Link>
                  <p className="text-xs text-zinc-500">{e.plan_name || PROGRAMS[e.program]} · {PLATFORMS[e.platform].label} · {formatMoney(e.amount, e.currency)}</p>
                </div>
                {log ? (
                  <span className={cn("chip", REMINDER_STATUS[log.status].className)} title={log.detail ?? undefined}>{REMINDER_STATUS[log.status].label}</span>
                ) : (
                  <span className="chip bg-amber-100 text-amber-800">Pendiente</span>
                )}
                <ReminderButton id={e.id} href={reminder(e, state)} label="WhatsApp" />
                <CopyButton text={preMessage(e)} label="Copiar para Skool" />
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------------- para cobrar */}
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><AlertTriangle className="size-5 text-amber-600" /> Para cobrar (Nequi, Wompi y otros)</h2>
      <p className="mb-3 text-sm text-zinc-500">Vencidos y los que vencen en los próximos {cfg.reminder_days} días. Envía el recordatorio y, cuando te llegue el comprobante, márcalo como pagado.</p>
      {toCollect.length === 0 ? (
        <p className="card mb-8 p-4 text-sm text-emerald-700">✅ Nadie pendiente por cobrar.</p>
      ) : (
        <ul className="card mb-8 divide-y divide-zinc-100">
          {toCollect.map(({ e, state }) => {
            const st = payStateLabel(state, e, today);
            const prof = profileOf(e.user_id);
            const late = e.paid_until ? daysBetween(e.paid_until, today) : 0;
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-48 flex-1">
                  <Link href={`/miembros/alumnos/${e.id}`} className="font-semibold hover:underline">{e.full_name}</Link>
                  <p className="text-xs text-zinc-500">
                    {e.plan_name || PROGRAMS[e.program]} · {PLATFORMS[e.platform].label} · {formatMoney(e.amount, e.currency)} {studentIntervalLabel(e.interval_days)}
                    {e.paid_until && <> · corte {formatDay(e.paid_until)}</>}
                    {e.last_reminder_at && <> · recordado {timeAgo(e.last_reminder_at)}</>}
                  </p>
                </div>
                <span className={cn("chip", st.className)}>{st.label}</span>
                <ReminderButton id={e.id} href={reminder(e, state)} />
                <QuickPaid e={e} label="Pagó" />
                {prof && prof.active && state === "vencido" && late > 3 && prof.role !== "admin" && prof.role !== "coach" && (
                  <form action={setAccountAccess}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="user_id" value={prof.id} />
                    <input type="hidden" name="active" value="false" />
                    <input type="hidden" name="back" value="list" />
                    <ConfirmButton message={`¿Quitarle el acceso a la academia a ${e.full_name}? Se le devuelve al registrar su pago.`} className="btn-sm">Quitar acceso</ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------------------------------------------- revisar automáticos */}
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><RefreshCw className="size-5 text-sky-600" /> Revisar en Whop y Skool</h2>
      <p className="mb-3 text-sm text-zinc-500">Su fecha de cobro automático ya pasó. Entra a Whop o Skool, mira si el cobro pasó y márcalo como renovado; si falló, avísale.</p>
      {toVerify.length === 0 ? (
        <p className="card mb-8 p-4 text-sm text-emerald-700">✅ Nada por revisar.</p>
      ) : (
        <ul className="card mb-8 divide-y divide-zinc-100">
          {toVerify.map(({ e, state }) => {
            const st = payStateLabel(state, e, today);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-48 flex-1">
                  <Link href={`/miembros/alumnos/${e.id}`} className="font-semibold hover:underline">{e.full_name}</Link>
                  <p className="text-xs text-zinc-500">
                    {e.email ?? "sin correo"} · {e.plan_name || PROGRAMS[e.program]} · {formatMoney(e.amount, e.currency)} {studentIntervalLabel(e.interval_days)}
                  </p>
                </div>
                <span className={cn("chip", st.className)}>{st.label}</span>
                <QuickPaid e={e} label="Ya renovó" />
                <ReminderButton id={e.id} href={reminder(e, state)} label="Avisar que falló" className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200" />
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------------------ lista */}
      <h2 id="lista" className="mb-3 flex items-center gap-2 text-lg font-bold"><Users className="size-5" /> Todos los alumnos</h2>
      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-zinc-400" />
          <input name="q" defaultValue={sp.q} placeholder="Nombre, correo, WhatsApp o plan" className="input pl-9" />
        </div>
        <select name="programa" defaultValue={sp.programa ?? ""} className="input w-auto">
          <option value="">Todos los programas</option>
          {Object.entries(PROGRAMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="plataforma" defaultValue={sp.plataforma ?? ""} className="input w-auto">
          <option value="">Todas las plataformas</option>
          {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="cobro" defaultValue={sp.cobro ?? ""} className="input w-auto">
          <option value="">Automático y manual</option>
          <option value="auto">Solo automático</option>
          <option value="manual">Solo manual</option>
        </select>
        <select name="estado" defaultValue={estado} className="input w-auto">
          <option value="activos">Activos</option>
          <option value="al_dia">Al día</option>
          <option value="por_vencer">Por vencer</option>
          <option value="vencido">Vencidos</option>
          <option value="sin_fecha">Sin fecha de pago</option>
          <option value="inactivos">Pausados, cancelados y finalizados</option>
          <option value="todos">Todos</option>
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      {list.length === 0 ? (
        <EmptyState icon={<GraduationCap className="size-10" />} title={all.length === 0 ? "Aún no has agregado alumnos" : "No hay alumnos con ese filtro"}>
          {all.length === 0 && <>Agrégalos uno por uno o <Link href="/miembros/alumnos/importar" className="text-brand underline">impórtalos todos de una vez</Link>.</>}
        </EmptyState>
      ) : (
        <div className="card mb-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 text-left text-xs font-semibold text-zinc-500">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Programa</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Próximo cobro</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map(({ e, state }) => {
                const st = e.status === "activo" ? payStateLabel(state, e, today) : ENROLLMENT_STATUS[e.status];
                const prof = profileOf(e.user_id);
                return (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/miembros/alumnos/${e.id}`} className="block">
                        <span className="block font-semibold">{e.full_name}</span>
                        <span className="block text-xs text-zinc-500">
                          {e.email ?? e.whatsapp ?? "—"}
                          {prof && <span className={cn("ml-1", prof.active ? "text-emerald-700" : "text-red-600")}>· {prof.active ? "con acceso" : "sin acceso"}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{e.plan_name || PROGRAMS[e.program]}</td>
                    <td className="px-4 py-3">
                      <span className={cn("chip", PLATFORMS[e.platform].className)}>{PLATFORMS[e.platform].label}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{e.auto_renew ? "Automático" : "Manual"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatMoney(e.amount, e.currency)}<span className="block text-xs text-zinc-500">{studentIntervalLabel(e.interval_days)}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDay(e.paid_until)}</td>
                    <td className="px-4 py-3"><span className={cn("chip", st.className)}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --------------------------------------------------- configuración */}
      <details className="card mb-10 p-5" open={!cfg.nequi_number && !cfg.wompi_link && all.length > 0}>
        <summary className="cursor-pointer font-semibold"><Settings2 className="mr-1 inline size-4" /> Datos de cobro y mensajes de WhatsApp</summary>
        <form action={saveBillingConfig} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="nequi_number">Tu número de Nequi</label>
            <input id="nequi_number" name="nequi_number" defaultValue={cfg.nequi_number ?? ""} placeholder="300 123 4567" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="wompi_link">Tu enlace de pago de Wompi</label>
            <input id="wompi_link" name="wompi_link" type="url" defaultValue={cfg.wompi_link ?? ""} placeholder="https://checkout.wompi.co/l/..." className="input" />
          </div>
          <div>
            <label className="label" htmlFor="reminder_days">Avisar cuántos días antes</label>
            <input id="reminder_days" name="reminder_days" type="number" min={0} max={30} defaultValue={cfg.reminder_days} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="days_before">Recordar cuántos días antes del pago</label>
            <input id="days_before" name="days_before" type="number" min={1} max={10} defaultValue={cfg.days_before} className="input" />
          </div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="auto_whatsapp" defaultChecked={cfg.auto_whatsapp} className="mt-0.5 accent-brand" />
            <span>
              <span className="font-medium">Enviar por la API de WhatsApp Business (opcional)</span>
              <span className="block text-xs text-zinc-500">
                Déjalo apagado si Cowork envía los mensajes desde tu WhatsApp. Actívalo solo si configuras la API de Meta (ver README).
              </span>
            </span>
          </label>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="template_manual">Recordatorio antes de vencer (Nequi / Wompi)</label>
            <textarea id="template_manual" name="template_manual" rows={4} defaultValue={cfg.template_manual ?? DEFAULT_TEMPLATES.manual} className="input text-sm" />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="template_overdue">Cuando ya venció (Nequi / Wompi)</label>
            <textarea id="template_overdue" name="template_overdue" rows={4} defaultValue={cfg.template_overdue ?? DEFAULT_TEMPLATES.overdue} className="input text-sm" />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="template_auto_failed">Cuando falló el cobro automático (Whop / Skool)</label>
            <textarea id="template_auto_failed" name="template_auto_failed" rows={4} defaultValue={cfg.template_auto_failed ?? DEFAULT_TEMPLATES.auto_failed} className="input text-sm" />
            <p className="mt-1 text-xs text-zinc-500">Puedes usar: {"{nombre} {programa} {fecha} {monto} {nequi} {wompi} {plataforma}"}</p>
          </div>
          <div className="sm:col-span-3"><SubmitButton pendingText="Guardando...">Guardar</SubmitButton></div>
        </form>
      </details>
    </div>
  );
}
