import Link from "next/link";
import { ArrowLeft, CreditCard, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  SUBSCRIPTION_COLUMNS, formatCop, formatDate, INTERVALS, intervalLabel, PAYMENT_STATUS, PLAN_ROLE_LABELS, SUBSCRIPTION_STATUS,
  type MembershipPlan, type Subscription, type SubscriptionPayment,
} from "@/lib/membership";
import { getOrigin } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelSubscription, createPlan, togglePlan } from "./actions";

export default async function MembershipsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: planRows, error: tableError }, { data: subRows }, { data: payRows }, origin] = await Promise.all([
    supabase.from("membership_plans").select("*").order("position").order("price_cop"),
    supabase.from("subscriptions").select(SUBSCRIPTION_COLUMNS).order("created_at", { ascending: false }).limit(300),
    supabase.from("subscription_payments").select("*").order("created_at", { ascending: false }).limit(50),
    getOrigin(),
  ]);
  const plans = (planRows ?? []) as MembershipPlan[];
  const subs = (subRows ?? []) as Subscription[];
  const payments = (payRows ?? []) as SubscriptionPayment[];

  const userIds = [...new Set([...subs.map((s) => s.user_id), ...payments.map((p) => p.user_id)])];
  const { data: users } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string) => users?.find((u) => u.id === id)?.full_name || "Alumno";
  const planOf = (id: string) => plans.find((p) => p.id === id);

  const live = subs.filter((s) => ["activa", "en_mora"].includes(s.status));
  const mrr = live
    .filter((s) => !s.cancel_at_period_end)
    .reduce((sum, s) => {
      const p = planOf(s.plan_id);
      return p ? sum + Math.round((p.price_cop * 30) / p.interval_days) : sum;
    }, 0);
  const approvedThisMonth = payments
    .filter((p) => p.status === "APPROVED" && new Date(p.created_at).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + p.amount_cop, 0);
  const shownSubs = subs.filter((s) => s.status !== "fallida" || Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/miembros" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Miembros
      </Link>
      <PageHeader
        title="Membresías (Nequi y tarjeta)"
        description="Cobro automático con Nequi o tarjeta débito/crédito (Wompi). Al pagar, el alumno recibe su acceso solo y se le renueva cada periodo; si no paga, se reintenta 3 días y luego vence."
      >
        <CopyButton text={`${origin}/membresia`} label="Copiar enlace de pago" />
      </PageHeader>

      {tableError && (
        <div className="mb-6">
          <FormMessage error="Falta aplicar la actualización de la base de datos (supabase/upgrade-05-membresia-nequi.sql)." />
        </div>
      )}
      {ok && <div className="mb-4"><FormMessage success="Plan creado. Ya aparece en la página de membresía." /></div>}
      {error && <div className="mb-4"><FormMessage error={error} /></div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Suscripciones activas</p>
          <p className="text-2xl font-bold">{live.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Ingreso recurrente mensual</p>
          <p className="text-2xl font-bold">{formatCop(mrr)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Cobrado este mes (últimos 50 pagos)</p>
          <p className="text-2xl font-bold">{formatCop(approvedThisMonth)}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold">Planes</h2>
      <form action={createPlan} className="card mb-4 grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nombre del plan</label>
          <input id="name" name="name" required maxLength={80} placeholder="Ej.: Membresía mensual" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price_cop">Precio en pesos (COP)</label>
          <input id="price_cop" name="price_cop" required inputMode="numeric" placeholder="Solo números, sin puntos" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="interval_days">Se cobra</label>
          <select id="interval_days" name="interval_days" defaultValue={30} className="input">
            {INTERVALS.map((i) => <option key={i.days} value={i.days}>{i.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="grants_role">Qué acceso da</label>
          <select id="grants_role" name="grants_role" defaultValue="kit" className="input">
            <option value="kit">Solo Kit COD (herramientas)</option>
            <option value="member">Academia completa</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Qué incluye (una línea por beneficio)</label>
          <textarea id="description" name="description" rows={3} maxLength={500} className="input" />
        </div>
        <div className="sm:col-span-2">
          <SubmitButton pendingText="Creando..."><Plus className="size-4" /> Crear plan</SubmitButton>
        </div>
      </form>

      {plans.length > 0 && (
        <ul className="mb-8 space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatCop(p.price_cop)} {intervalLabel(p.interval_days)} · {PLAN_ROLE_LABELS[p.grants_role]}
                </p>
              </div>
              <span className={cn("chip", p.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600")}>
                {p.active ? "Visible" : "Oculto"}
              </span>
              <form action={togglePlan}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={String(!p.active)} />
                <button className="btn btn-secondary btn-sm">{p.active ? "Ocultar" : "Mostrar"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-lg font-bold">Suscripciones</h2>
      {shownSubs.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-10" />} title="Aún no hay suscripciones">
          Comparte el enlace de pago con tus alumnos.
        </EmptyState>
      ) : (
        <ul className="mb-8 space-y-2">
          {shownSubs.map((s) => {
            const st = SUBSCRIPTION_STATUS[s.status];
            return (
              <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/miembros/${s.user_id}`} className="font-semibold hover:underline">{nameOf(s.user_id)}</Link>
                  <p className="text-xs text-zinc-500">
                    {planOf(s.plan_id)?.name ?? "Plan"}
                    {s.payment_method === "CARD" ? <> · Tarjeta {s.card_brand ?? ""} •••• {s.card_last4}</> : s.phone_last4 && <> · Nequi •••• {s.phone_last4}</>}
                    {s.current_period_end && <> · {s.cancel_at_period_end ? "acceso hasta" : "renueva"} {formatDate(s.current_period_end)}</>}
                    {s.last_error && s.status !== "activa" && <> · {s.last_error}</>}
                  </p>
                </div>
                <span className={cn("chip", st.className)}>{s.cancel_at_period_end && s.status === "activa" ? "Cancela al final del periodo" : st.label}</span>
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
              <span className="font-semibold">{formatCop(p.amount_cop)}</span>
              <span className={cn("chip", PAYMENT_STATUS[p.status].className)} title={p.status_message ?? undefined}>{PAYMENT_STATUS[p.status].label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
