"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Smartphone, Tag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatUsdApprox } from "@/lib/fx";
import { discountLabel, formatCop } from "@/lib/membership";
import { cn } from "@/lib/utils";
import { CardCheckout } from "./CardCheckout";
import { NequiCheckout } from "./NequiCheckout";
import { NextSteps } from "./NextSteps";

type Applied = { code: string; label: string; first_price: number; regular_price: number };

/**
 * Checkout de un plan. Sin sesión, el alumno solo escribe su nombre y correo (el mismo de Skool):
 * la cuenta se crea sola al pagar. Al aprobarse el pago se muestran los pasos para entrar a Skool.
 */
export function PaymentChooser({ planId, resumePending, guest, skoolUrl, whatsapp, copPerUsd = null }: {
  planId: string; resumePending: boolean; guest: boolean; skoolUrl: string; whatsapp: string; copPerUsd?: number | null;
}) {
  const supabase = useRef(createClient()).current;
  const [method, setMethod] = useState<"nequi" | "card">("nequi");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const getGuest = useCallback((): { email: string; name: string } | null | string => {
    if (!guest) return null;
    if (name.trim().length < 3) return "Escribe tu nombre completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Escribe un correo válido.";
    return { email: email.trim().toLowerCase(), name: name.trim() };
  }, [guest, name, email]);
  const onDone = useCallback(() => setPaid(true), []);

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setCodeError(null);
    const { data, error } = await supabase.functions.invoke("nequi-suscripcion", {
      body: { action: "validar_codigo", plan_id: planId, discount_code: code },
    });
    setChecking(false);
    if (error || !data?.valid) {
      let msg = "Ese código no sirve.";
      try { msg = (await (error as { context?: Response })?.context?.json())?.error ?? msg; } catch { /* sin cuerpo */ }
      setCodeError(msg);
      return;
    }
    setApplied({ code: data.code, label: discountLabel(data), first_price: data.first_price, regular_price: data.regular_price });
    setOpen(false);
  }

  if (paid && guest) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="size-5" /> ¡Pago aprobado! Tu membresía de MakeDrop IA está activa.
        </p>
        <NextSteps skoolUrl={skoolUrl} whatsapp={whatsapp} name={name} savedEmail={email.trim().toLowerCase()} checkoutToken={token} autoRedirect />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {guest && (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name"
            placeholder="Nombre completo" aria-label="Nombre completo" className="input" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
            placeholder="Tu correo (el mismo de tu cuenta de Skool)" aria-label="Correo" className="input" />
        </div>
      )}

      {applied ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div>
            <p className="font-semibold text-emerald-800"><Tag className="mr-1 inline size-4" />Cupón aplicado: {applied.code}</p>
            <p className="mt-0.5 text-emerald-700">
              {applied.label}. Hoy pagas <b>{formatCop(applied.first_price)}</b>
              {copPerUsd && <> ({formatUsdApprox(applied.first_price, copPerUsd)})</>}
              {applied.first_price !== applied.regular_price && <> <s className="text-emerald-600/70">{formatCop(applied.regular_price)}</s></>}
            </p>
          </div>
          <button type="button" onClick={() => { setApplied(null); setCode(""); }} className="text-emerald-700" aria-label="Quitar código">
            <X className="size-4" />
          </button>
        </div>
      ) : open ? (
        <form onSubmit={applyCode} className="space-y-2">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30))}
              placeholder="Código de descuento"
              aria-label="Código de descuento"
              className="input min-w-0 flex-1 font-mono uppercase"
              autoFocus
            />
            <button type="submit" disabled={checking} className="btn btn-secondary">
              {checking ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
            </button>
          </div>
          {codeError && <p className="text-sm text-red-700">{codeError}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand hover:underline">
          <Tag className="mr-1 inline size-4" />¿Tienes un código de descuento?
        </button>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
        {([
          { id: "nequi", label: "Nequi", icon: Smartphone },
          { id: "card", label: "Tarjeta", icon: CreditCard },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 transition", method === id ? "bg-white shadow-sm" : "text-zinc-500")}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {method === "nequi" ? (
        <NequiCheckout planId={planId} resumePending={resumePending} discountCode={applied?.code}
          getGuest={getGuest} checkoutToken={token} onToken={setToken} onDone={onDone} />
      ) : (
        <CardCheckout planId={planId} discountCode={applied?.code}
          getGuest={getGuest} checkoutToken={token} onToken={setToken} onDone={onDone} />
      )}
    </div>
  );
}
