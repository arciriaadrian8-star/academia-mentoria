"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { LandingMode } from "@/lib/landing";

const STEPS_FULL = [
  "Mirando las fotos de tu producto",
  "Escribiendo tu título ganador",
  "Escribiendo la descripción y las preguntas frecuentes",
  "Creando las fotos de antes, después y usos con IA",
  "Armando tus imágenes vendedoras",
];
const STEPS_FAST = ["Mirando las fotos de tu producto", "Escribiendo tu título ganador", "Escribiendo la descripción y los prompts de tus fotos"];

export function AutoRefresh({ since, mode = "completa" }: { since: string; mode?: LandingMode }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [router]);
  const seconds = Math.max(Math.round((now - new Date(since).getTime()) / 1000), 0);
  const steps = mode === "completa" ? STEPS_FULL : STEPS_FAST;
  const perStep = mode === "completa" ? 14 : 10;
  const current = Math.min(Math.floor(seconds / perStep), steps.length - 1);
  return (
    <div className="card mx-auto max-w-lg p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex size-16 items-center justify-center rounded-full bg-brand/10">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
        <p className="mt-4 text-lg font-bold">La IA está trabajando…</p>
        <p className="text-sm text-zinc-500">
          {seconds} s · suele tardar {mode === "completa" ? "alrededor de 1 minuto" : "unos 30 a 40 segundos"}. Puedes salir y volver luego.
        </p>
      </div>
      <ol className="mt-6 space-y-2.5">
        {steps.map((step, i) => (
          <li key={step} className={`flex items-center gap-3 text-sm ${i > current ? "text-zinc-400" : "text-zinc-800"}`}>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i < current ? "bg-emerald-500 text-white" : i === current ? "bg-brand text-white" : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {i < current ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={i === current ? "font-semibold" : ""}>{step}{i === current ? "…" : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
