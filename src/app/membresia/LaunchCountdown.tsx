"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** Cuenta regresiva real hasta el fin del precio de lanzamiento. Se oculta sola cuando termina. */
export function LaunchCountdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null || now >= end) return null;
  const s = Math.floor((end - now) / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: "días" },
    { v: Math.floor((s % 86400) / 3600), l: "horas" },
    { v: Math.floor((s % 3600) / 60), l: "min" },
    { v: s % 60, l: "seg" },
  ];

  return (
    <div className="mb-4 rounded-2xl bg-red-600 p-4 text-center text-white shadow-sm">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold">
        <Timer className="size-4" /> El precio de lanzamiento termina en:
      </p>
      <div className="mt-2 flex justify-center gap-3">
        {parts.map((p) => (
          <div key={p.l} className="min-w-14 rounded-lg bg-white/15 px-2 py-1.5">
            <p className="text-2xl font-bold tabular-nums">{String(p.v).padStart(2, "0")}</p>
            <p className="text-[11px] uppercase tracking-wide">{p.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
