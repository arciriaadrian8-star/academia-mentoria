import Link from "next/link";
import { ArrowLeft, CreditCard, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { MAKEDROP } from "@/lib/makedrop";
import {
  SUBSCRIPTION_COLUMNS, discountLabel, formatCop, formatDate, INTERVALS, intervalLabel, PAYMENT_STATUS, SUBSCRIPTION_STATUS,
  type DiscountCode, type MembershipPlan, type Subscription, type SubscriptionPayment,
} from "@/lib/membership";
import { getOrigin } from "@/lib/site";
import { formatUsdApprox, getCopPerUsd } from "@/lib/fx";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelSubscription, createCode, createPlan, deleteCode, toggleCode, togglePlan, updatePlan } from "./actions";

function PlanFields({ plan }: { plan?: MembershipPlan }) {
  const k = plan?.id ?? "new";
  return (
    <>
      <div>
        <label className="label" htmlFor={`name-${k}`}>Nombre del plan</label>
        <input id={`name-${k}`} name="name" required maxLength={80} defaultValue={plan?.name ?? "MakeDrop IA"} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`price-${k}`}>Precio en pesos (COP)</label>
        <input id={`price-${k}`} name="price_cop" required inputMode="numeric" defaultValue={plan?.price_cop ?? ""} placeholder="Solo números, sin puntos" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`cmp-${k}`}>Precio normal tachado (opcional)</label>
        <input id={`cmp-${k}`} name="compare_price_cop" inputMode="numeric" defaultValue={plan?.compare_price_cop ?? ""} placeholder="Si lo llenas, sale tachado con «Cupón aplicado»" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`int-${k}`}>Se cobra</label>
        <select id={`int-${k}`} name="interval_days" defaultValue={plan?.interval_days ?? 30} className="input">
          {INTERVALS.map((i) => <option key={i.days} value={i.days}>{i.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`wa-${k}`}>Tu WhatsApp (para que te envíen el correo)</label>
        <input id={`wa-${k}`} name="contact_whatsapp" inputMode="numeric" defaultValue={plan?.contact_whatsapp ?? MAKEDROP.whatsapp} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`sk-${k}`}>Enlace de tu Skool</label>
        <input id={`sk-${k}`} name="skool_url" type="url" defaultValue={plan?.skool_url ?? MAKEDROP.skoolUrl} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`desc-${k}`}>Qué incluye (una línea por beneficio)</label>
        <textarea id={`desc-${k}`} name="description" rows={4} maxLength={500} defaultValue={plan?.description ?? ""} className="input" />
      </div>
    </>
  );
}

export default async function MembershipsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: planRows, error: tableError }, { data: subRows }, { data: payRows }, { data: codeRows }, origin, { data: upcomingRows }, { data: healthRows }] = await Promise.all([
    supabase.from("membership_plans").select("*").order("position").order("price_cop"),
    supabase.from("subscriptions").select(SUBSCRIPTION_COLUMNS).order("created_at", { ascending: false }).limit(300),
    supabase.from("subscription_payments").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
    getOrigin(),
    supabase.rpc("admin_upcoming_charges"),
    supabase.rpc("admin_billing_health"),
  ]);
  const copPerUsd = await getCopPerUsd();
  const usd = (cop: number) => { const t = formatUsdApprox(cop, copPerUsd); return t ? <span className="ml-1 text-xs font-normal text-zinc-500">({t})</span> : null; };
  type Upcoming = { subscription_id: string; next_charge_at: string | null; amount_cop: number; has_source: boolean; payment_method: string; cancel_at_period_end: boolean; status: string };
  const upcoming = (upcomingRows ?? []) as Upcoming[];
  const upcomingOf = (id: string) => upcoming.find((u) => u.subscription_id === id);
  const health = ((healthRows ?? []) as { last_run: string | null; last_status: string | null; runs_24h: number; failed_24h: number }[])[0];
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  const plans = (planRows ?? []) as MembershipPlan[];
  const subs = (subRows ?? []) as unknown as Subscription[];
  const payments = (payRows ?? []) as SubscriptionPayment[];
  const codes = (codeRows ?? []) as DiscountCode[];

  const userIds = [...new Set([...subs.map((s) => s.user_id), ...payments.map((p) => p.user_id)])];
  const { data: users } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string) => users?.find((u) => u.id === id)?.full_name || "Alumno";
  const planOf = (id: string | null) => plans.find((p) => p.id === id);

  const live = subs.filter((s) => ["activa", "en_mora"].includes(s.status));
  const mrr = live
    .filter((s) => !s.cancel_at_period_end)
    .reduce((sum, s) => {
      const p = planOf(s.plan_id);
      return p ? sum + Math.round((p.price_cop * 30) / p.interval_days) : sum;
    }, 0);
  const now = new Date();
  const approvedThisMonth = payments
    .filter((p) => p.status === "APPROVED" && new Date(p.created_at).getMonth() === now.getMonth() && new Date(p.created_at).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.amount_cop, 0);
  const shownSubs = subs.filter((s) => s.status !== "fallida" || Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000);
  const skoolEmails = live.map((s) => s.skool_email || s.customer_email).filter(Boolean).join("\n");

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/miembros" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Miembros
      </Link>
      <PageHeader
        title="Pagos MakeDrop IA"
        description="Cobro automático con Nequi o tarjeta (Wompi). Quien paga recibe solo el Kit COD; tú lo invitas a Skool con su correo. Si no paga, se reintenta 3 días y luego vence."
      >
        <CopyButton text={`${origin}/membresia`} label="Copiar enlace de pago" />
      </PageHeader>

      {tableError && <div className="mb-6"><FormMessage error="Falta aplicar la actualización de la base de datos." /></div>}
      {ok && <div className="mb-4"><FormMessage success={ok} /></div>}
      {error && <div className="mb-4"><FormMessage error={error} /></div>}

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-zinc-500">Suscripciones activas</p><p className="text-2xl font-bold">{live.length}</p></div>
        <div className="card p-4"><p className="text-xs text-zinc-500">Ingreso recurrente mensual</p><p className="text-2xl font-bold">{formatCop(mrr)}{usd(mrr)}</p></div>
        <div className="card p-4"><p className="text-xs text-zinc-500">Cobrado este mes</p><p className="text-2xl font-bold">{formatCop(approvedThisMonth)}{usd(approvedThisMonth)}</p></div>
      </div>

      {/* ------------------------------------------------- Cobro automático */}
      <h2 className="mb-3 text-lg font-bold">Cobro automático</h2>
      <div className="card mb-3 p-4 text-sm">
        {health?.last_run ? (
          <p className={cn("font-semibold", health.last_status === "succeeded" && health.failed_24h === 0 ? "text-emerald-700" : "text-red-700")}>
            {health.last_status === "succeeded" && health.failed_24h === 0 ? "✅ Funcionando" : "⚠️ Revisar"}
            <span className="ml-2 font-normal text-zinc-600">
              Última revisión: {fmtDateTime(health.last_run)} · revisa 3 veces al día (8 a.m., 2 p.m. y 8 p.m.)
              {health.failed_24h > 0 && ` · ${health.failed_24h} fallos en las últimas 24 h`}
            </span>
          </p>
        ) : (
          <p className="font-semibold text-red-700">⚠️ El cobro automático aún no ha corrido.</p>
        )}
        {copPerUsd && (
          <p className="mt-1 text-xs text-zinc-500">
            Los dólares son aproximados (1 US$ ≈ {formatCop(Math.round(copPerUsd))} hoy). Wompi siempre cobra en pesos colombianos.
          </p>
        )}
      </div>
      {upcoming.length === 0 ? (
        <p className="mb-10 text-sm text-zinc-500">No hay cobros programados.</p>
      ) : (
        <ul className="card mb-10 divide-y divide-zinc-100">
          {upcoming.map((u) => {
            const s = subs.find((x) => x.id === u.subscription_id);
            const ok = u.has_source && !u.cancel_at_period_end && u.next_charge_at;
            return (
              <li key={u.subscription_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 font-medium">{s ? nameOf(s.user_id) : "Alumno"}<span className="block text-xs font-normal text-zinc-500">{s?.customer_email}</span></span>
                {ok ? (
                  <>
                    <span className="text-zinc-600">{fmtDateTime(u.next_charge_at!)}</span>
                    <span className="font-semibold">{formatCop(u.amount_cop)}{usd(u.amount_cop)}</span>
                    <span className="chip bg-emerald-100 text-emerald-800">✅ Se cobra solo · {u.payment_method === "CARD" ? "Tarjeta" : "Nequi"}</span>
                  </>
                ) : u.cancel_at_period_end ? (
                  <span className="chip bg-zinc-100 text-zinc-600">Cancelada: no se cobra más</span>
                ) : !u.has_source ? (
                  <span className="chip bg-red-100 text-red-700">⚠️ Sin medio de pago guardado: no se puede cobrar solo</span>
                ) : (
                  <span className="chip bg-amber-100 text-amber-800">Sin fecha de cobro (reintentos agotados)</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------------------ Planes */}
      <h2 className="mb-3 text-lg font-bold">Plan y precio</h2>
      {plans.length > 0 && (
        <ul className="mb-4 space-y-3">
          {plans.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {p.compare_price_cop && p.compare_price_cop > p.price_cop && <><s>{formatCop(p.compare_price_cop)}</s> → </>}
                    {formatCop(p.price_cop)}{usd(p.price_cop)} {intervalLabel(p.interval_days)} · acceso solo al Kit COD
                  </p>
                </div>
                <span className={cn("chip", p.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600")}>{p.active ? "Visible" : "Oculto"}</span>
                <form action={togglePlan}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(!p.active)} />
                  <button className="btn btn-secondary btn-sm">{p.active ? "Ocultar" : "Mostrar"}</button>
                </form>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand"><Pencil className="mr-1 inline size-3.5" />Editar precio y datos</summary>
                <form action={updatePlan} className="mt-3 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={p.id} />
                  <PlanFields plan={p} />
                  <div className="sm:col-span-2"><SubmitButton pendingText="Guardando...">Guardar cambios</SubmitButton></div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
      <details className="card mb-10 p-5" open={plans.length === 0}>
        <summary className="cursor-pointer font-semibold"><Plus className="mr-1 inline size-4" />Crear plan</summary>
        <form action={createPlan} className="mt-4 grid gap-4 sm:grid-cols-2">
          <PlanFields />
          <div className="sm:col-span-2"><SubmitButton pendingText="Creando...">Crear plan</SubmitButton></div>
        </form>
      </details>

      {/* ------------------------------------------------- Códigos de descuento */}
      <h2 className="mb-3 text-lg font-bold">Códigos de descuento</h2>
      <form action={createCode} className="card mb-4 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="code">Código</label>
          <input id="code" name="code" required maxLength={30} placeholder="Ej.: LIVE20" className="input font-mono uppercase" />
        </div>
        <div>
          <label className="label" htmlFor="kind">Tipo</label>
          <select id="kind" name="kind" defaultValue="percent" className="input">
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Valor fijo (COP)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="value">Valor</label>
          <input id="value" name="value" required inputMode="numeric" placeholder="Ej.: 20 (%) o 10000 ($)" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="duration">Aplica</label>
          <select id="duration" name="duration" defaultValue="first" className="input">
            <option value="first">Solo el primer cobro</option>
            <option value="months">Por varios cobros</option>
            <option value="forever">En todos los cobros</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="duration_months">¿Cuántos cobros? (si es «varios»)</label>
          <input id="duration_months" name="duration_months" inputMode="numeric" placeholder="Ej.: 3" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="max_redemptions">Usos máximos (vacío = sin límite)</label>
          <input id="max_redemptions" name="max_redemptions" inputMode="numeric" placeholder="Ej.: 20" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="expires_at">Vence el (opcional)</label>
          <input id="expires_at" name="expires_at" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="plan_id">Para el plan</label>
          <select id="plan_id" name="plan_id" defaultValue="" className="input">
            <option value="">Todos los planes</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Nota interna (opcional)</label>
          <input id="description" name="description" maxLength={200} placeholder="Ej.: Live del jueves" className="input" />
        </div>
        <div className="sm:col-span-3">
          <SubmitButton pendingText="Creando..."><Tag className="size-4" /> Crear código</SubmitButton>
          <p className="mt-2 text-xs text-zinc-500">El cobro nunca baja de $1.500 (mínimo de Wompi). Si un alumno ya usó un código, cambiarlo o desactivarlo no le cambia su descuento.</p>
        </div>
      </form>
      {codes.length === 0 ? (
        <p className="mb-10 text-sm text-zinc-500">Aún no has creado códigos.</p>
      ) : (
        <ul className="mb-10 space-y-2">
          {codes.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            const soldOut = c.max_redemptions !== null && c.redemptions >= c.max_redemptions;
            const status = !c.active ? ["Desactivado", "bg-zinc-100 text-zinc-600"] : expired ? ["Vencido", "bg-zinc-100 text-zinc-600"] : soldOut ? ["Agotado", "bg-amber-100 text-amber-800"] : ["Activo", "bg-emerald-100 text-emerald-800"];
            return (
              <li key={c.code} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-bold">{c.code}</p>
                  <p className="text-xs text-zinc-500">
                    {discountLabel(c)} · usado {c.redemptions}{c.max_redemptions ? ` de ${c.max_redemptions}` : ""} veces
                    {c.expires_at && <> · vence {formatDate(c.expires_at)}</>}
                    {c.plan_id && <> · solo {planOf(c.plan_id)?.name ?? "un plan"}</>}
                    {c.description && <> · {c.description}</>}
                  </p>
                </div>
                <span className={cn("chip", status[1])}>{status[0]}</span>
                <CopyButton text={c.code} label="Copiar" />
                <form action={toggleCode}>
                  <input type="hidden" name="code" value={c.code} />
                  <input type="hidden" name="active" value={String(!c.active)} />
                  <button className="btn btn-secondary btn-sm">{c.active ? "Desactivar" : "Activar"}</button>
                </form>
                {c.redemptions === 0 && (
                  <form action={deleteCode}>
                    <input type="hidden" name="code" value={c.code} />
                    <ConfirmButton message={`¿Borrar el código ${c.code}?`} className="btn-sm" aria-label="Borrar código">
                      <Trash2 className="size-3.5" />
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------------ Suscripciones */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Suscripciones</h2>
        {skoolEmails && <CopyButton text={skoolEmails} label="Copiar correos de los activos (para Skool)" />}
      </div>
      {shownSubs.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-10" />} title="Aún no hay suscripciones">Comparte el enlace de pago.</EmptyState>
      ) : (
        <ul className="mb-10 space-y-2">
          {shownSubs.map((s) => {
            const st = SUBSCRIPTION_STATUS[s.status];
            return (
              <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/miembros/${s.user_id}`} className="font-semibold hover:underline">{nameOf(s.user_id)}</Link>
                  <p className="text-xs text-zinc-500">
                    {s.customer_email}
                    {s.skool_email && s.skool_email !== s.customer_email && <> · Skool: <b>{s.skool_email}</b></>}
                    {" · "}{planOf(s.plan_id)?.name ?? "Plan"}
                    {s.payment_method === "CARD" ? <> · Tarjeta {s.card_brand ?? ""} •••• {s.card_last4}</> : s.phone_last4 && <> · Nequi •••• {s.phone_last4}</>}
                    {s.discount_code && <> · código {s.discount_code}</>}
                    {s.current_period_end && <> · {s.cancel_at_period_end ? "acceso hasta" : "renueva"} {formatDate(s.current_period_end)}</>}
                    {s.last_error && s.status !== "activa" && <> · {s.last_error}</>}
                  </p>
                </div>
                <span className={cn("chip", st.className)}>{s.cancel_at_period_end && s.status === "activa" ? "Cancela al final del periodo" : st.label}</span>
                <CopyButton text={s.skool_email || s.customer_email} label="Copiar correo" />
                {["activa", "en_mora", "pendiente"].includes(s.status) && !s.cancel_at_period_end && (
                  <form action={cancelSubscription}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton message={`¿Cancelar la membresía de ${nameOf(s.user_id)}? No se le cobra más y conserva el acceso hasta fin del periodo pagado.`} className="btn-sm">
                      Cancelar
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-3 text-lg font-bold">Últimos cobros</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay cobros.</p>
      ) : (
        <ul className="card divide-y divide-zinc-100">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="w-36 text-zinc-500">{formatDate(p.created_at)}</span>
              <span className="min-w-0 flex-1 font-medium">{nameOf(p.user_id)}</span>
              <span className="font-semibold">{formatCop(p.amount_cop)}{usd(p.amount_cop)}</span>
              <span className={cn("chip", PAYMENT_STATUS[p.status].className)} title={p.status_message ?? undefined}>{PAYMENT_STATUS[p.status].label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
