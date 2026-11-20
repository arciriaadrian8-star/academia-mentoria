"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle, Timer } from "lucide-react";

const KEY = "makedrop_reserva_inicio";

/**
 * Reserva el precio de lanzamiento 15 minutos por visitante (desde su primera visita, no se reinicia al recargar).
 * Cuando se acaba, los botones de pago se quitan y solo queda escribir por WhatsApp para pedir cupo.
 */
export function LaunchCountdown({ minutes, whatsappUrl, children }: { minutes: number; whatsappUrl: string; children: ReactNode }) {
  const [end, setEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let start = Date.now();
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (saved > 0) start = saved;
      else localStorage.setItem(KEY, String(start));
    } catch { /* sin almacenamiento: cuenta desde ahora */ }
    setEnd(start + minutes * 60_000);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [minutes]);

  if (end === null) return <>{children}</>;
  const left = Math.max(0, Math.floor((end - now) / 1000));

  if (left === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-bold">Tu precio de lanzamiento reservado expiró</p>
        <p className="mt-2 text-sm text-zinc-600">
          Los 15 minutos de reserva terminaron. Escríbeme por WhatsApp y te digo si todavía queda cupo a este precio.
        </p>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5">
          <MessageCircle className="size-4" /> Preguntar por cupo
        </a>
      </div>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <>
      <div className="mb-4 rounded-2xl bg-red-600 p-4 text-center text-white shadow-sm">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold">
          <Timer className="size-4" /> Te reservamos el precio de lanzamiento por:
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{mm}:{ss}</p>
        <p className="mt-1 text-xs text-white/90">Cuando llegue a cero, este precio deja de estar disponible para ti.</p>
      </div>
      {children}
    </>
  );
}
