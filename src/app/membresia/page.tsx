import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getSession, getSettings } from "@/lib/auth";
import {
  formatCop, formatDate, intervalLabel, PAYMENT_STATUS, PLAN_ROLE_LABELS, SUBSCRIPTION_STATUS,
  type MembershipPlan, type Subscription, type SubscriptionPayment,
} from "@/lib/membership";
import { cn } from "@/lib/utils";
import { NequiCheckout } from "./NequiCheckout";
import { SubscriptionActions } from "./SubscriptionActions";

export const metadata = { title: "Membresía" };

export default async function MembershipPage() {
  const [{ supabase, user, profile }, settings] = await Promise.all([getSession(), getSettings()]);
  const { data: planRows } = await supabase
    .from("membership_plans").select("*").eq("active", true).order("position").order("price_cop");
  const plans = (planRows ?? []) as MembershipPlan[];

  let sub: Subscription | null = null;
  let payments: SubscriptionPayment[] = [];
  if (user) {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    sub = (data as Subscription) ?? null;
    if (sub) {
      const { data: pays } = await supabase.from("subscription_payments").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(12);
      payments = (pays ?? []) as SubscriptionPayment[];
    }
  }
  const live = sub && ["activa", "en_mora"].includes(sub.status) ? sub : null;
  const livePlan = live ? plans.find((p) => p.id === live.plan_id) : null;
  const homeHref = !profile?.active ? null : profile.role === "kit" ? "/kit" : "/inicio";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        {settings.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt="" className="mb-4 size-14 rounded-2xl object-cover" />
        ) : (
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
            {settings.academy_name.charAt(0)}
          </div>
        )}
        <p className="text-sm font-semibold text-zinc-500">{settings.academy_name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Membresía</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          Pagas con tu Nequi y se renueva sola cada periodo. Lo autorizas una vez en tu app y puedes cancelar cuando quieras.
        </p>
      </div>

      {live ? (
        <section className="card mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500">Tu plan</p>
              <p className="text-xl font-bold">{livePlan?.name ?? "Membresía"}</p>
            </div>
            <span className={cn("chip", SUBSCRIPTION_STATUS[live.status].className)}>{SUBSCRIPTION_STATUS[live.status].label}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {livePlan && (
              <div>
                <dt className="text-zinc-500">Precio</dt>
                <dd className="font-semibold">{formatCop(livePlan.price_cop)} {intervalLabel(livePlan.interval_days)}</dd>
              </div>
            )}
            {live.phone_last4 && (
              <div>
                <dt className="text-zinc-500">Nequi</dt>
                <dd className="font-semibold">•••• {live.phone_last4}</dd>
              </div>
            )}
            {live.current_period_end && (
              <div>
                <dt className="text-zinc-500">{live.cancel_at_period_end ? "Acceso hasta" : "Próximo cobro"}</dt>
                <dd className="font-semibold">{formatDate(live.cancel_at_period_end ? live.current_period_end : live.next_charge_at ?? live.current_period_end)}</dd>
              </div>
            )}
          </dl>
          {live.status === "en_mora" && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              No pudimos cobrar tu última cuota{live.last_error ? ` (${live.last_error})` : ""}. Deja saldo en tu Nequi: lo reintentamos
              automáticamente al día siguiente.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {homeHref && <Link href={homeHref} className="btn btn-primary">Entrar a la academia</Link>}
            <SubscriptionActions subscriptionId={live.id} canceled={live.cancel_at_period_end} />
          </div>
        </section>
      ) : plans.length === 0 ? (
        <section className="card p-8 text-center text-sm text-zinc-500">Pronto abriremos las inscripciones.</section>
      ) : (
        <section className="space-y-4">
          {sub?.status === "fallida" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Tu último intento no se completó{sub.last_error ? `: ${sub.last_error}` : ""}. Puedes intentarlo de nuevo.
            </p>
          )}
          <div className={cn("grid gap-4", plans.length > 1 && "sm:grid-cols-2")}>
            {plans.map((plan) => (
              <div key={plan.id} className="card flex flex-col p-6">
                <p className="text-sm font-semibold text-zinc-500">{PLAN_ROLE_LABELS[plan.grants_role]}</p>
                <h2 className="mt-1 text-xl font-bold">{plan.name}</h2>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  {formatCop(plan.price_cop)}
                  <span className="ml-1 text-sm font-medium text-zinc-500">{intervalLabel(plan.interval_days)}</span>
                </p>
                {plan.description && (
                  <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                    {plan.description.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {line}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-6">
                  {user ? (
                    <NequiCheckout planId={plan.id} resumePending={sub?.status === "pendiente" && sub.plan_id === plan.id} />
                  ) : (
                    <div className="space-y-2">
                      <Link href="/registro" className="btn btn-primary w-full">Crear mi cuenta para suscribirme</Link>
                      <Link href="/login" className="btn btn-secondary w-full">Ya tengo cuenta</Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {payments.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Historial de pagos</h2>
          <ul className="card divide-y divide-zinc-100">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>{formatDate(p.created_at)}</span>
                <span className="font-semibold">{formatCop(p.amount_cop)}</span>
                <span className={cn("chip", PAYMENT_STATUS[p.status].className)}>{PAYMENT_STATUS[p.status].label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {user && !homeHref && (
        <p className="mt-8 text-center text-sm text-zinc-500">
          ¿Necesitas ayuda? Escríbele a tu mentor.
        </p>
      )}
    </main>
  );
}
