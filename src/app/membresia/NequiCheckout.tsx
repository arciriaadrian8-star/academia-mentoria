"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Smartphone } from "lucide-react";
import { FormMessage } from "@/components/FormMessage";
import { createClient } from "@/lib/supabase/client";

type Phase = "form" | "waiting" | "charging" | "done";

/** Lee el mensaje de error que devuelve la Edge Function. */
async function errorMessage(error: unknown) {
  const ctx = (error as { context?: Response })?.context;
  try {
    const body = await ctx?.json();
    if (body?.error) return String(body.error);
  } catch { /* sin cuerpo */ }
  return "No pudimos conectar con Nequi. Intenta de nuevo.";
}

export function NequiCheckout({ planId, resumePending = false }: { planId: string; resumePending?: boolean }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [phase, setPhase] = useState<Phase>(resumePending ? "waiting" : "form");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("nequi-suscripcion", { body: { action: "estado" } });
    if (error) return;
    if (data?.status === "activa") {
      setPhase("done");
      router.refresh();
    } else if (data?.status === "fallida") {
      setPhase("form");
      setError(data.last_error ? `No se completó: ${data.last_error}` : "No se completó el pago. Intenta de nuevo.");
      router.refresh();
    }
  }, [supabase, router]);

  // Mientras espera la aprobación en Nequi, revisa cada 4 segundos (máx. 10 minutos).
  useEffect(() => {
    if (phase !== "waiting") return;
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started > 10 * 60_000) {
        clearInterval(id);
        setPhase("form");
        setError("No vimos la aprobación en Nequi. Intenta de nuevo.");
        return;
      }
      void check();
    }, 4000);
    void check();
    return () => clearInterval(id);
  }, [phase, check]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.functions.invoke("nequi-suscripcion", {
      body: { action: "iniciar", plan_id: planId, phone },
    });
    setBusy(false);
    if (error) return setError(await errorMessage(error));
    setPhase("waiting");
  }

  if (phase === "done") {
    return <FormMessage success="¡Listo! Tu membresía está activa. Ya puedes entrar a la academia." />;
  }

  if (phase === "waiting" || phase === "charging") {
    return (
      <div className="space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <Loader2 className="size-4 animate-spin" /> Abre tu app Nequi
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-600">
          <li>Te llegó una notificación para autorizar el débito automático.</li>
          <li>Acéptala en tu app Nequi.</li>
          <li>Deja esta página abierta: tu acceso se activa solo en cuanto se haga el primer cobro.</li>
        </ol>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPhase("form"); setError(null); }}>
          Usar otro número
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={start} className="space-y-3">
      <FormMessage error={error} />
      <div>
        <label className="label" htmlFor={`phone-${planId}`}>Tu número Nequi</label>
        <input
          id={`phone-${planId}`}
          type="tel"
          inputMode="numeric"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="3001234567"
          maxLength={13}
          className="input"
        />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
        Suscribirme con Nequi
      </button>
      <p className="text-center text-xs text-zinc-500">Pago seguro procesado por Wompi (Grupo Bancolombia).</p>
    </form>
  );
}
