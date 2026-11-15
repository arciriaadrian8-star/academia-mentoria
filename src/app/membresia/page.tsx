import Link from "next/link";
import { CheckCircle2, Wrench } from "lucide-react";
import { getSession } from "@/lib/auth";
import { MAKEDROP } from "@/lib/makedrop";
import {
  SUBSCRIPTION_COLUMNS, formatCop, formatDate, intervalLabel, PAYMENT_STATUS, SUBSCRIPTION_STATUS,
  type MembershipPlan, type Subscription, type SubscriptionPayment,
} from "@/lib/membership";
import { cn } from "@/lib/utils";
import { signOut } from "../actions";
import { NextSteps } from "./NextSteps";
import { PaymentChooser } from "./PaymentChooser";

export const metadata = { title: "MakeDrop IA | Membresía" };

/* eslint-disable @next/next/no-img-element */
export default async function MembershipPage() {
  const { supabase, user, profile } = await getSession();
  const { data: planRows } = await supabase
    .from("membership_plans").select("*").eq("active", true).order("position").order("price_cop");
  const plans = (planRows ?? []) as MembershipPlan[];

  let sub: Subscription | null = null;
  let payments: SubscriptionPayment[] = [];
  if (user) {
    const { data } = await supabase.from("subscriptions").select(SUBSCRIPTION_COLUMNS).eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    sub = (data as Subscription | null) ?? null;
    if (sub) {
      const { data: pays } = await supabase.from("subscription_payments").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(12);
      payments = (pays ?? []) as SubscriptionPayment[];
    }
  }
  const live = sub && ["activa", "en_mora"].includes(sub.status) ? sub : null;
  let livePlan: MembershipPlan | null = live ? plans.find((p) => p.id === live.plan_id) ?? null : null;
  if (live && !livePlan) {
    const { data } = await supabase.from("membership_plans").select("*").eq("id", live.plan_id).maybeSingle();
    livePlan = (data as MembershipPlan | null) ?? null;
  }
  const hasKit = Boolean(profile?.active);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src={MAKEDROP.logo} alt="" className="size-9 rounded-lg object-cover" />
            <span className="font-bold tracking-tight">{MAKEDROP.fullName}</span>
          </div>
          {user && (
            <form action={signOut}>
              <button className="text-sm text-zinc-500 hover:text-zinc-900">Cerrar sesión</button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <img src={MAKEDROP.hero} alt="MakeDrop IA: tus primeras 100 ventas en 90 días" className="mb-8 w-full rounded-2xl shadow-sm" />

        {live ? (
          <section className="space-y-6">
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">Tu membresía</p>
                  <p className="text-xl font-bold">{livePlan?.name ?? MAKEDROP.name}</p>
                </div>
                <span className={cn("chip", SUBSCRIPTION_STATUS[live.status].className)}>
                  {SUBSCRIPTION_STATUS[live.status].label}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                {livePlan && (
                  <div>
                    <dt className="text-zinc-500">Precio</dt>
                    <dd className="font-semibold">{formatCop(livePlan.price_cop)} {intervalLabel(livePlan.interval_days)}</dd>
                  </div>
                )}
                {(live.phone_last4 || live.card_last4) && (
                  <div>
                    <dt className="text-zinc-500">{live.payment_method === "CARD" ? "Tarjeta" : "Nequi"}</dt>
                    <dd className="font-semibold">
                      {live.payment_method === "CARD" ? `${live.card_brand ?? ""} •••• ${live.card_last4 ?? ""}` : `•••• ${live.phone_last4}`}
                    </dd>
                  </div>
                )}
                {live.current_period_end && (
                  <div>
                    <dt className="text-zinc-500">{live.cancel_at_period_end ? "Acceso hasta" : "Próximo cobro"}</dt>
                    <dd className="font-semibold">{formatDate(live.cancel_at_period_end ? live.current_period_end : live.next_charge_at ?? live.current_period_end)}</dd>
                  </div>
                )}
              </dl>
              {live.discount_code && live.discount_remaining !== 0 && (
                <p className="mt-3 text-sm text-emerald-700">
                  Código {live.discount_code} aplicado{live.discount_remaining > 0 ? ` (te quedan ${live.discount_remaining} cobros con descuento)` : " en todos tus cobros"}.
                </p>
              )}
              {live.status === "en_mora" && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  No pudimos cobrar tu última cuota{live.last_error ? ` (${live.last_error})` : ""}. Revisa que tengas saldo: lo reintentamos
                  automáticamente al día siguiente.
                </p>
              )}
              {hasKit && (
                <div className="mt-5">
                  <Link href="/kit" className="btn btn-secondary"><Wrench className="size-4" /> Ir al Kit COD</Link>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="mb-4 text-lg font-bold">Entra a la comunidad de MakeDrop IA</h2>
              <NextSteps
                skoolUrl={livePlan?.skool_url || MAKEDROP.skoolUrl}
                whatsapp={livePlan?.contact_whatsapp || MAKEDROP.whatsapp}
                name={profile?.full_name ?? ""}
                savedEmail={live.skool_email ?? live.customer_email}
              />
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
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  {plan.compare_price_cop && plan.compare_price_cop > plan.price_cop && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <s className="text-zinc-400">{formatCop(plan.compare_price_cop)}</s>
                      <span className="chip bg-emerald-100 font-semibold text-emerald-800">Cupón aplicado</span>
                    </p>
                  )}
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {formatCop(plan.price_cop)}
                    <span className="ml-1 text-sm font-medium text-zinc-500">{intervalLabel(plan.interval_days)}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Cobro automático cada mes.</p>
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
                    <PaymentChooser
                      planId={plan.id}
                      resumePending={Boolean(user) && sub?.status === "pendiente" && sub?.plan_id === plan.id}
                      guest={!user}
                      skoolUrl={plan.skool_url || MAKEDROP.skoolUrl}
                      whatsapp={plan.contact_whatsapp || MAKEDROP.whatsapp}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 space-y-4">
          {MAKEDROP.gallery.map((img) => (
            <img key={img.src} src={img.src} alt={img.alt} loading="lazy" className="w-full rounded-2xl shadow-sm" />
          ))}
        </section>

        {payments.length > 0 && (
          <section className="mt-10">
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

        <p className="mt-10 text-center text-xs text-zinc-400">Pagos procesados de forma segura por Wompi (Grupo Bancolombia).</p>
      </main>
    </div>
  );
}
