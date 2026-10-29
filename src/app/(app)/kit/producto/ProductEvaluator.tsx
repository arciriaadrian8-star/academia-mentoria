"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { loadLocal, saveLocal } from "@/lib/kit";

type Answer = 0 | 1 | 2; // no · más o menos · sí

const CRITERIA: { id: string; group: string; q: string; why: string; weight: number; critical?: boolean }[] = [
  { id: "gancho", group: "Gancho", q: "¿Se entiende y llama la atención en 2 segundos de video?", why: "Si no detiene el scroll, ningún anuncio lo salva.", weight: 3 },
  { id: "wow", group: "Gancho", q: "¿Tiene efecto «wow» o una demostración visual fuerte?", why: "Los productos que se demuestran solos venden con menos inversión.", weight: 2 },
  { id: "dolor", group: "Dolor o deseo", q: "¿Resuelve un problema claro o un deseo fuerte?", why: "La gente compra soluciones, no productos.", weight: 3, critical: true },
  { id: "tienda", group: "Dolor o deseo", q: "¿Es difícil de encontrar en tiendas físicas cercanas?", why: "Si está en el supermercado de la esquina, compiten con el precio.", weight: 2 },
  { id: "angulos", group: "Dolor o deseo", q: "¿Se puede vender con varios ángulos (dolor, transformación, comodidad…)?", why: "Más ángulos = más creativos para probar antes de descartarlo.", weight: 1 },
  { id: "margen", group: "Margen", q: "¿El precio de venta es al menos 3 veces el costo del proveedor?", why: "En COD necesitas margen para publicidad, fletes y devoluciones.", weight: 3, critical: true },
  { id: "precio", group: "Margen", q: "¿El precio de venta está en el rango de compra impulsiva de tu país?", why: "En Colombia, entre $59.900 y $149.900 se compra sin pensarlo mucho.", weight: 2 },
  { id: "logistica", group: "Logística", q: "¿Es liviano, no frágil y sin tallas complicadas?", why: "Menos daños, menos cambios y menos devoluciones.", weight: 2 },
  { id: "proveedor", group: "Logística", q: "¿Tiene proveedor Verificado / Premium en Dropi con stock suficiente?", why: "Sin proveedor confiable se cae la operación al escalar.", weight: 3, critical: true },
  { id: "regulado", group: "Logística", q: "¿Se puede pautar sin problemas (no es regulado ni prohibido en anuncios)?", why: "Suplementos, armas, adultos o salud con promesas médicas pueden bloquear la cuenta.", weight: 2, critical: true },
  { id: "validado", group: "Validación", q: "¿Encontraste anuncios activos de este producto hace 7 días o más en la Biblioteca de anuncios?", why: "Si otros llevan días pautándolo, es porque les está funcionando.", weight: 2 },
  { id: "saturado", group: "Validación", q: "¿Aún puedes diferenciarte (mejor oferta, mejor ángulo o mejor creativo)?", why: "Un producto saturado solo funciona si llegas con algo distinto.", weight: 1 },
];

const KEY = "academia-evaluador-v1";
const LABELS: Record<Answer, string> = { 0: "No", 1: "Más o menos", 2: "Sí" };

export function ProductEvaluator() {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const saved = loadLocal<{ name: string; answers: Record<string, Answer> }>(KEY);
    if (saved) {
      setName(saved.name ?? "");
      setAnswers(saved.answers ?? {});
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveLocal(KEY, { name, answers });
  }, [name, answers, loaded]);

  const answered = CRITERIA.filter((c) => answers[c.id] !== undefined).length;
  const max = CRITERIA.reduce((s, c) => s + c.weight * 2, 0);
  const score = CRITERIA.reduce((s, c) => s + (answers[c.id] ?? 0) * c.weight, 0);
  const percent = Math.round((score / max) * 100);
  const failedCritical = CRITERIA.filter((c) => c.critical && answers[c.id] === 0);
  const weak = CRITERIA.filter((c) => answers[c.id] !== undefined && answers[c.id]! < 2).sort((a, b) => b.weight - a.weight);

  const verdict =
    answered < CRITERIA.length
      ? { tone: "", title: `Responde las ${CRITERIA.length} preguntas`, text: `Llevas ${answered} de ${CRITERIA.length}.` }
      : failedCritical.length > 0
        ? { tone: "bad", title: "⛔ No lo pruebes todavía", text: `Falla en algo crítico: ${failedCritical.map((c) => c.group.toLowerCase()).join(", ")}. Arréglalo o busca otro producto.` }
        : percent >= 75
          ? { tone: "good", title: "🚀 Producto con potencial: ¡pruébalo!", text: "Prepara 3 creativos con ángulos distintos y lanza el test." }
          : percent >= 55
            ? { tone: "warn", title: "🛠️ Puede funcionar si mejoras lo débil", text: "Refuerza la oferta, el margen o el ángulo antes de invertir." }
            : { tone: "bad", title: "⛔ Mejor busca otro producto", text: "Tiene demasiados puntos débiles para contra entrega." };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="space-y-3">
        <div className="card p-5">
          <label className="label" htmlFor="name">Producto que estás evaluando</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: Corrector de postura" />
        </div>
        {CRITERIA.map((c, i) => (
          <div key={c.id} className="card p-4">
            <p className="text-xs font-semibold text-zinc-500">
              {i + 1}. {c.group} {c.critical && <span className="text-red-600">· crítico</span>}
            </p>
            <p className="mt-0.5 font-medium">{c.q}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{c.why}</p>
            <div className="mt-3 flex gap-2">
              {([2, 1, 0] as Answer[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAnswers((s) => ({ ...s, [c.id]: a }))}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    answers[c.id] === a
                      ? a === 2
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : a === 1
                          ? "border-amber-400 bg-amber-50 text-amber-800"
                          : "border-red-400 bg-red-50 text-red-800"
                      : "border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  {LABELS[a]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-32">
        <div
          className={cn(
            "rounded-2xl border-2 p-5",
            verdict.tone === "good" && "border-emerald-300 bg-emerald-50",
            verdict.tone === "warn" && "border-amber-300 bg-amber-50",
            verdict.tone === "bad" && "border-red-300 bg-red-50",
            !verdict.tone && "border-zinc-200 bg-white",
          )}
        >
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{name || "Tu producto"}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{percent}<span className="text-lg text-zinc-400">/100</span></p>
          <p className="mt-2 font-semibold">{verdict.title}</p>
          <p className="mt-1 text-sm text-zinc-700">{verdict.text}</p>
        </div>
        {weak.length > 0 && (
          <div className="card p-4">
            <p className="font-semibold">Qué mejorar primero</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {weak.slice(0, 5).map((c) => (
                <li key={c.id}>{c.why}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="card p-4 text-sm text-zinc-600">
          ¿Pasó la prueba? Sácale los números en las <Link href="/calculadoras" className="font-semibold text-brand hover:underline">Calculadoras</Link> y crea los creativos en el{" "}
          <Link href="/kit/prompts" className="font-semibold text-brand hover:underline">Generador de prompts</Link>.
        </div>
        <button type="button" onClick={() => { setAnswers({}); setName(""); }} className="text-xs font-semibold text-zinc-500 hover:underline">
          Evaluar otro producto
        </button>
      </aside>
    </div>
  );
}
