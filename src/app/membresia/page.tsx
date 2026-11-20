import { CheckCircle2, CreditCard, ExternalLink, MessageCircle, ShieldCheck } from "lucide-react";
import { MAKEDROP, whatsappLink } from "@/lib/makedrop";
import { getVideoEmbed } from "@/lib/video";

export const metadata = { title: "MakeDrop IA | Membresía" };

/** Pagos con Whop (tarjeta, también internacional). Precios en dólares. */
const PLANS = [
  {
    id: "anual",
    name: "Plan anual",
    price: "$139",
    period: "USD / año",
    note: "Equivale a $11,58 USD al mes. Pagas una vez y tienes acceso todo el año.",
    badge: "Más elegido · Ahorra 52%",
    checkout: "https://whop.com/checkout/plan_ItnqYxPrFUrpA",
    featured: true,
  },
  {
    id: "mensual",
    name: "Plan mensual",
    price: "$24",
    period: "USD / mes",
    note: "Cobro automático cada mes con tu tarjeta.",
    badge: null,
    checkout: "https://whop.com/checkout/plan_TCtvoJbQp3WGF",
    featured: false,
  },
] as const;

/* eslint-disable @next/next/no-img-element */
export default function MembershipPage() {
  const video = getVideoEmbed(MAKEDROP.video);
  const waLink = whatsappLink(
    MAKEDROP.whatsapp,
    "Hola Adrián 👋 Ya pagué MakeDrop IA en Whop. Mi nombre es ____ y mi correo de Skool es: ____",
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-3">
          <img src={MAKEDROP.logo} alt="" className="size-9 rounded-lg object-cover" />
          <span className="font-bold tracking-tight">{MAKEDROP.fullName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <img src={MAKEDROP.hero} alt="MakeDrop IA: tus primeras 100 ventas en 90 días" className="mb-8 w-full rounded-2xl shadow-sm" />

        {video && (
          <section className="mb-8 overflow-hidden rounded-2xl bg-black shadow-sm">
            <div className="aspect-video">
              {video.type === "iframe" ? (
                <iframe src={video.src} title="Video de MakeDrop IA" className="size-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              ) : (
                <video src={video.src} controls playsInline className="size-full" />
              )}
            </div>
          </section>
        )}

        <section id="planes" className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`card flex flex-col p-6 ${plan.featured ? "ring-2 ring-blue-600" : ""}`}
            >
              {plan.badge && (
                <span className="chip mb-3 w-fit bg-blue-600 font-semibold text-white">{plan.badge}</span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-2 text-4xl font-bold tracking-tight">
                {plan.price}
                <span className="ml-1 text-sm font-medium text-zinc-500">{plan.period}</span>
              </p>
              <p className="mt-2 text-sm text-zinc-600">{plan.note}</p>
              <div className="mt-auto pt-6">
                <a href={plan.checkout} className={`btn w-full ${plan.featured ? "btn-primary" : "btn-secondary"}`}>
                  <CreditCard className="size-4" /> Pagar {plan.price} USD con tarjeta
                </a>
              </div>
            </div>
          ))}
        </section>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-500">
          <ShieldCheck className="size-4" /> Pago seguro con Whop. Aceptamos tarjetas de crédito y débito de cualquier país.
        </p>

        <section className="card mt-8 p-6">
          <h2 className="text-lg font-bold">¿Ya pagaste? Así entras a la comunidad</h2>
          <ol className="mt-4 space-y-4 text-sm text-zinc-700">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
              <span>
                <b>Paga tu plan en Whop</b> con el botón de arriba. Usa un correo que revises, porque con ese mismo correo
                te vamos a invitar.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
              <span>
                <b>Crea tu cuenta gratis en Skool</b> con ese mismo correo, si todavía no tienes una.{" "}
                <a href="https://www.skool.com/signup" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                  Crear cuenta en skool.com <ExternalLink className="inline size-3" />
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
              <span>
                <b>Escríbeme por WhatsApp</b> con tu nombre y tu correo de Skool. Toca el botón y el mensaje ya sale escrito:
                solo completa tus datos.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">4</span>
              <span>
                <b>Acepta la invitación</b> que te llega a tu correo y entra a la comunidad privada de MakeDrop IA en Skool.
              </span>
            </li>
          </ol>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6 w-full">
            <MessageCircle className="size-4" /> Ya pagué: escribir por WhatsApp
          </a>
        </section>

        <section className="mt-10 space-y-4">
          {MAKEDROP.gallery.map((img) => (
            <img key={img.src} src={img.src} alt={img.alt} loading="lazy" className="w-full rounded-2xl shadow-sm" />
          ))}
        </section>

        <div className="mt-8 text-center">
          <a href="#planes" className="btn btn-primary">
            <CheckCircle2 className="size-4" /> Quiero entrar a MakeDrop IA
          </a>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-400">Pagos procesados de forma segura por Whop. Precios en dólares (USD).</p>
      </main>
    </div>
  );
}
