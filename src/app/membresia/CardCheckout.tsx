"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { FormMessage } from "@/components/FormMessage";
import { createClient } from "@/lib/supabase/client";

async function errorMessage(error: unknown) {
  const ctx = (error as { context?: Response })?.context;
  try {
    const body = await ctx?.json();
    if (body?.error) return String(body.error);
  } catch { /* sin cuerpo */ }
  return "No pudimos procesar tu tarjeta. Intenta de nuevo.";
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

/**
 * Pago con tarjeta débito/crédito. Los datos de la tarjeta van directo del navegador a Wompi
 * (nunca pasan por nuestro servidor): Wompi devuelve un token y con ese token se crea la suscripción.
 */
export function CardCheckout({ planId }: { planId: string }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el cobro quedó «en proceso», revisa cada 4 s (máx. 3 minutos).
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - started > 3 * 60_000) {
        clearInterval(id);
        setWaiting(false);
        setError("Tu banco aún no confirma el pago. Revisa en unos minutos esta página.");
        return;
      }
      const { data } = await supabase.functions.invoke("nequi-suscripcion", { body: { action: "estado" } });
      if (data?.status === "activa") { clearInterval(id); setWaiting(false); setDone(true); router.refresh(); }
      else if (data?.status === "fallida") {
        clearInterval(id); setWaiting(false);
        setError(data.last_error ? `Pago rechazado: ${data.last_error}` : "Tu banco rechazó el pago. Prueba con otra tarjeta.");
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(id);
  }, [waiting, supabase, router]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = onlyDigits(number);
    const [mm, yy] = exp.split("/").map((s) => onlyDigits(s ?? ""));
    if (num.length < 13 || num.length > 19) return setError("Revisa el número de la tarjeta.");
    if (!mm || !yy || Number(mm) < 1 || Number(mm) > 12) return setError("Escribe la fecha de vencimiento como MM/AA.");
    if (cvc.length < 3) return setError("Revisa el código de seguridad (CVC).");
    if (holder.trim().length < 5) return setError("Escribe el nombre como aparece en la tarjeta.");

    setBusy(true);
    try {
      const { data: cfg, error: cfgError } = await supabase.functions.invoke("nequi-suscripcion", { body: { action: "config" } });
      if (cfgError || !cfg?.public_key) throw new Error(cfgError ? await errorMessage(cfgError) : "Pagos con tarjeta no disponibles.");
      const base = String(cfg.public_key).startsWith("pub_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";

      const res = await fetch(`${base}/tokens/cards`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.public_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, cvc, exp_month: mm.padStart(2, "0"), exp_year: yy.slice(-2), card_holder: holder.trim() }),
      });
      const tok = await res.json().catch(() => null);
      if (!res.ok || !tok?.data?.id) throw new Error("Los datos de la tarjeta no son válidos. Revísalos e intenta de nuevo.");

      const { data, error } = await supabase.functions.invoke("nequi-suscripcion", {
        body: { action: "iniciar_tarjeta", plan_id: planId, card_token: tok.data.id, brand: tok.data.brand, last4: tok.data.last_four },
      });
      if (error) throw new Error(await errorMessage(error));
      if (data?.status === "activa") { setDone(true); router.refresh(); }
      else if (data?.status === "fallida") setError(data.last_error ? `Pago rechazado: ${data.last_error}` : "Tu banco rechazó el pago. Prueba con otra tarjeta.");
      else setWaiting(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <FormMessage success="¡Listo! Tu membresía está activa. Ya puedes entrar a la academia." />;
  if (waiting) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-zinc-50 p-4 text-sm font-semibold">
        <Loader2 className="size-4 animate-spin" /> Confirmando el pago con tu banco...
      </p>
    );
  }

  return (
    <form onSubmit={pay} className="space-y-3">
      <FormMessage error={error} />
      <div>
        <label className="label" htmlFor={`cn-${planId}`}>Número de la tarjeta</label>
        <input id={`cn-${planId}`} inputMode="numeric" autoComplete="cc-number" required maxLength={23} className="input font-mono"
          placeholder="1234 5678 9012 3456" value={number}
          onChange={(e) => setNumber(onlyDigits(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`ce-${planId}`}>Vence (MM/AA)</label>
          <input id={`ce-${planId}`} inputMode="numeric" autoComplete="cc-exp" required maxLength={5} className="input font-mono"
            placeholder="08/29" value={exp}
            onChange={(e) => { const d = onlyDigits(e.target.value).slice(0, 4); setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} />
        </div>
        <div>
          <label className="label" htmlFor={`cc-${planId}`}>CVC</label>
          <input id={`cc-${planId}`} inputMode="numeric" autoComplete="cc-csc" required maxLength={4} className="input font-mono"
            placeholder="123" value={cvc} onChange={(e) => setCvc(onlyDigits(e.target.value).slice(0, 4))} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`ch-${planId}`}>Nombre en la tarjeta</label>
        <input id={`ch-${planId}`} autoComplete="cc-name" required maxLength={60} className="input uppercase"
          value={holder} onChange={(e) => setHolder(e.target.value)} />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        Suscribirme con tarjeta
      </button>
      <p className="flex items-center justify-center gap-1 text-center text-xs text-zinc-500">
        <Lock className="size-3" /> Débito o crédito, nacional o internacional. Procesado por Wompi; tu tarjeta no se guarda en nuestra web.
      </p>
    </form>
  );
}
