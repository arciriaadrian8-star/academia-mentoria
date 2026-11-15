"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
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

/** El HTML del reto 3D Secure llega con entidades (&lt; &gt;…): se decodifica antes de pintarlo. */
function decodeEntities(html: string) {
  if (!html.includes("&lt;")) return html; // ya viene como HTML normal
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.documentElement.textContent ?? html;
}

function browserInfo() {
  return {
    browser_color_depth: String(window.screen.colorDepth ?? 24),
    browser_screen_height: String(window.screen.height ?? 800),
    browser_screen_width: String(window.screen.width ?? 1280),
    browser_language: navigator.language || "es-CO",
    browser_user_agent: navigator.userAgent,
    browser_tz: String(new Date().getTimezoneOffset()),
  };
}

type ThreeDs = { step: string | null; step_status: string | null; html: string | null } | null;

/**
 * Pago con tarjeta débito/crédito (nacional o internacional).
 * 1. Los datos de la tarjeta van directo del navegador a Wompi (nunca a nuestro servidor) y se crean 2 tokens.
 * 2. El primer cobro se hace con 3D Secure: si el banco lo pide, se muestra aquí su verificación.
 * 3. Si se aprueba, la tarjeta queda guardada en Wompi para los cobros mensuales.
 */
export function CardCheckout({ planId, discountCode, getGuest, checkoutToken, onToken, onDone }: {
  planId: string; discountCode?: string;
  getGuest?: () => { email: string; name: string } | null | string;
  checkoutToken?: string | null; onToken?: (t: string) => void; onDone?: () => void;
}) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [threeDs, setThreeDs] = useState<ThreeDs>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastHtml = useRef<string | null>(null);
  const tokenRef = useRef<string | null | undefined>(checkoutToken);
  tokenRef.current = checkoutToken ?? tokenRef.current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [iframeHtml, setIframeHtml] = useState<string | null>(null);

  // Mientras el primer pago está en proceso, consulta su estado cada 2,5 s (máx. 5 minutos).
  useEffect(() => {
    if (!txId) return;
    const started = Date.now();
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started > 5 * 60_000) {
        setTxId(null);
        setError("Tu banco no confirmó el pago a tiempo. Intenta de nuevo.");
        return;
      }
      const { data } = await supabase.functions.invoke("nequi-suscripcion", { body: { action: "estado_tarjeta", transaction_id: txId, checkout_token: tokenRef.current } });
      if (stopped) return;
      if (data?.status === "APPROVED") { setTxId(null); setDone(true); onDoneRef.current?.(); router.refresh(); return; }
      if (["DECLINED", "VOIDED", "ERROR"].includes(data?.status)) {
        setTxId(null);
        setIframeHtml(null);
        setError(data.message ? `Pago rechazado: ${data.message}` : "Tu banco rechazó el pago. Prueba con otra tarjeta.");
        router.refresh();
        return;
      }
      const t = (data?.three_ds ?? null) as ThreeDs;
      setThreeDs(t);
      if (t?.html && t.step_status === "PENDING" && t.html !== lastHtml.current) {
        lastHtml.current = t.html;
        setIframeHtml(decodeEntities(t.html));
      }
      setTimeout(tick, 2500);
    };
    const first = setTimeout(tick, 1500);
    return () => { stopped = true; clearTimeout(first); };
  }, [txId, supabase, router]);

  async function tokenize(base: string, key: string, card: Record<string, string>) {
    const res = await fetch(`${base}/tokens/cards`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    const tok = await res.json().catch(() => null);
    if (!res.ok || !tok?.data?.id) throw new Error("Los datos de la tarjeta no son válidos. Revísalos e intenta de nuevo.");
    return tok.data as { id: string; brand?: string; last_four?: string };
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = onlyDigits(number);
    const [mm, yy] = exp.split("/").map((s) => onlyDigits(s ?? ""));
    if (num.length < 13 || num.length > 19) return setError("Revisa el número de la tarjeta.");
    if (!mm || !yy || Number(mm) < 1 || Number(mm) > 12) return setError("Escribe la fecha de vencimiento como MM/AA.");
    if (cvc.length < 3) return setError("Revisa el código de seguridad (CVC).");
    if (holder.trim().length < 5) return setError("Escribe el nombre como aparece en la tarjeta.");
    if (onlyDigits(phone).length < 7) return setError("Escribe tu número de celular.");
    const g = getGuest ? getGuest() : null;
    if (typeof g === "string") return setError(g);

    setBusy(true);
    try {
      const { data: cfg, error: cfgError } = await supabase.functions.invoke("nequi-suscripcion", { body: { action: "config" } });
      if (cfgError || !cfg?.public_key) throw new Error(cfgError ? await errorMessage(cfgError) : "Pagos con tarjeta no disponibles.");
      const key = String(cfg.public_key);
      const base = key.startsWith("pub_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
      const card = { number: num, cvc, exp_month: mm.padStart(2, "0"), exp_year: yy.slice(-2), card_holder: holder.trim() };

      // Un token para el primer pago (3D Secure) y otro para guardar la tarjeta para los cobros mensuales.
      const first = await tokenize(base, key, card);
      const second = await tokenize(base, key, card);

      const { data, error } = await supabase.functions.invoke("nequi-suscripcion", {
        body: {
          action: "iniciar_tarjeta", plan_id: planId, card_token: first.id, source_token: second.id,
          brand: first.brand, last4: first.last_four, full_name: g?.name || holder.trim(), phone, browser_info: browserInfo(),
          discount_code: discountCode, customer_email: g?.email,
        },
      });
      if (error) throw new Error(await errorMessage(error));
      if (data?.checkout_token) { tokenRef.current = String(data.checkout_token); onToken?.(String(data.checkout_token)); }
      if (data?.status === "APPROVED") { setDone(true); onDone?.(); router.refresh(); }
      else if (["DECLINED", "VOIDED", "ERROR"].includes(data?.status)) setError("Tu banco rechazó el pago. Prueba con otra tarjeta.");
      else { setCvc(""); setNumber(""); setTxId(String(data.transaction_id)); }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <FormMessage success="¡Pago aprobado! Tu membresía de MakeDrop IA está activa." />;

  if (txId) {
    const challenge = threeDs?.step === "CHALLENGE";
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3 text-sm font-semibold">
          <Loader2 className="size-4 animate-spin" />
          {challenge ? "Tu banco te pide confirmar el pago:" : "Verificando el pago con tu banco (3D Secure)..."}
        </p>
        {threeDs && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck className="size-4 text-emerald-600" /> Verificación segura 3D Secure (Visa Secure / Mastercard Identity Check)
          </p>
        )}
        {iframeHtml && (
          <iframe
            title="Verificación de tu banco"
            srcDoc={iframeHtml}
            className="w-full rounded-xl border border-zinc-200 bg-white"
            style={{ height: challenge ? 520 : 120 }}
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation-by-user-activation allow-popups"
          />
        )}
        <p className="text-xs text-zinc-500">No cierres esta página hasta que termine.</p>
      </div>
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
      <div>
        <label className="label" htmlFor={`cp-${planId}`}>Celular</label>
        <input id={`cp-${planId}`} type="tel" inputMode="tel" autoComplete="tel" required maxLength={16} className="input"
          placeholder="3001234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        Suscribirme con tarjeta
      </button>
      <p className="flex items-center justify-center gap-1 text-center text-xs text-zinc-500">
        <Lock className="size-3" /> Débito o crédito, nacional o internacional. Verificado con 3D Secure y procesado por Wompi; tu tarjeta no se guarda en nuestra web.
      </p>
    </form>
  );
}
