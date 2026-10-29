"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const STEPS = ["Subiendo el video a la IA…", "La IA está viendo tu video…", "Analizando gancho, estructura y ángulo…", "Escribiendo tu guion escena por escena…", "Preparando los prompts para Flow / Veo…"];

export function AutoRefresh({ since }: { since: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      router.refresh();
    }, 2000);
    return () => clearInterval(t);
  }, [router]);
  const seconds = Math.max(Math.round((now - new Date(since).getTime()) / 1000), 0);
  const step = STEPS[Math.min(Math.floor(seconds / 8), STEPS.length - 1)];
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <Loader2 className="size-10 animate-spin text-brand" />
      <p className="text-lg font-semibold">{step}</p>
      <p className="text-sm text-zinc-500">{seconds} s · suele tardar entre 20 segundos y 1 minuto. Puedes salir y volver luego.</p>
    </div>
  );
}
