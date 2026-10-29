"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRIES, loadLocal, saveLocal } from "@/lib/kit";
import { ANGLES, buildSections, type AngleId, type Ctx } from "@/lib/prompts";
import { CopyButton } from "@/components/CopyButton";
import { TextField } from "@/components/kit/KitUI";

const DEFAULTS: Ctx = {
  producto: "Faja reductora para mujer",
  beneficio: "moldea tu cintura al instante y te da seguridad",
  dolor: "no te sientes cómoda con tu figura al vestirte",
  cliente: "mujeres de 25 a 45 años",
  pais: "Colombia",
  precio: "$89.900",
  precioAntes: "$159.900",
  oferta: "2x1 + envío gratis",
  angulo: "transformacion",
};

const KEY = "academia-prompts-v1";

const GROUPS = [
  { id: "angulos", label: "Ángulos y ganchos" },
  { id: "copy", label: "Textos del anuncio" },
  { id: "imagenes", label: "Imágenes" },
  { id: "pagina", label: "Página de producto" },
  { id: "video-ugc", label: "🎥 UGC presentador IA" },
  { id: "video-demo", label: "🎥 Problema → solución" },
  { id: "video-antes-despues", label: "🎥 Antes y después" },
  { id: "video-esqueleto", label: "💀 Esqueleto educativo" },
  { id: "video-animado", label: "✨ Historia animada 3D" },
  { id: "video-objeto", label: "🗣️ Producto que habla" },
  { id: "video-pov", label: "📦 POV / unboxing" },
  { id: "video-comparacion", label: "⚖️ Comparación" },
  { id: "maestro", label: "Prompt maestro" },
];

export function PromptGenerator() {
  const [ctx, setCtx] = useState<Ctx>(DEFAULTS);
  const [group, setGroup] = useState("angulos");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadLocal<Ctx>(KEY);
    if (saved) setCtx({ ...DEFAULTS, ...saved });
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveLocal(KEY, ctx);
  }, [ctx, loaded]);

  const values = ctx as unknown as Record<string, string>;
  const set = (k: string, value: string) => setCtx((c) => ({ ...c, [k]: value }));
  const sections = useMemo(() => buildSections(ctx), [ctx]);
  const section = sections.find((s) => s.id === group) ?? sections[0];
  const allText = section.items.map((i) => `## ${i.title}\n${i.text}`).join("\n\n");

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <aside className="card space-y-4 p-5 lg:sticky lg:top-32">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand" /> Tu producto</h2>
        <TextField v={values} set={set} k="producto" label="Nombre del producto" placeholder="Ej: Corrector de postura" />
        <TextField v={values} set={set} k="beneficio" label="Beneficio principal" placeholder="Ej: elimina el dolor de espalda" textarea />
        <TextField v={values} set={set} k="dolor" label="Problema o dolor que resuelve" placeholder="Ej: te duele la espalda al final del día" textarea />
        <TextField v={values} set={set} k="cliente" label="Cliente ideal" placeholder="Ej: personas que trabajan sentadas" />
        <div>
          <label className="label" htmlFor="pais">País</label>
          <select id="pais" value={ctx.pais} onChange={(e) => set("pais", e.target.value)} className="input">
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField v={values} set={set} k="precio" label="Precio" placeholder="$89.900" />
          <TextField v={values} set={set} k="precioAntes" label="Precio antes" placeholder="$159.900" />
        </div>
        <TextField v={values} set={set} k="oferta" label="Oferta" placeholder="Ej: 2x1 + envío gratis" />
        <div>
          <span className="label">Ángulo de venta</span>
          <div className="grid grid-cols-2 gap-2">
            {ANGLES.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.hint}
                onClick={() => setCtx((c) => ({ ...c, angulo: a.id as AngleId }))}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-left text-xs font-medium",
                  ctx.angulo === a.id ? "border-brand bg-brand/10 text-brand" : "border-zinc-200 hover:bg-zinc-50",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-500">Todo se actualiza solo. Se guarda en este navegador.</p>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={cn(
                "chip px-3 py-1.5 text-sm",
                group === g.id ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{section.description}</p>
              <p className="mt-1 text-xs font-medium text-brand">{section.tools}</p>
            </div>
            <CopyButton text={allText} label="Copiar todo" />
          </div>
        </section>

        {section.items.map((item, i) => (
          <article key={i} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{item.title}</h3>
              <CopyButton text={item.text} />
            </div>
            <pre className="mt-3 rounded-xl bg-zinc-50 p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">{item.text}</pre>
            {item.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠️ {item.note}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
