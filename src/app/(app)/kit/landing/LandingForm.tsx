"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Check, ChevronDown, ImagePlus, Loader2, PenLine, Rocket, Sparkles, WandSparkles, X, Zap, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, loadLocal, saveLocal } from "@/lib/kit";
import { AUDIENCES, BRAND_COLORS, DEFAULT_COLOR, descriptionPrompt, LANDING_BUCKET, LANDING_MODES, type LandingMode, type PointsBalance } from "@/lib/landing";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { createLanding, type LandingState } from "./actions";
import { shrinkImage } from "./shrink";

const MAX_PHOTOS = 3;
const MAX_GIF_MB = 8;

/** Color más llamativo de la foto del producto, para sugerirlo como color de la página. */
async function suggestColor(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = 48;
    c.height = 48;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.35 || max < 60 || max > 250) continue; // ignora fondos blancos, grises y negros
      let h = 0;
      if (max === r) h = ((g - b) / (max - min)) % 6;
      else if (max === g) h = (b - r) / (max - min) + 2;
      else h = (r - g) / (max - min) + 4;
      const key = Math.round(((h * 60 + 360) % 360) / 20);
      const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, { n: cur.n + 1, r: cur.r + r, g: cur.g + g, b: cur.b + b });
    }
    const best = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
    if (!best || best.n < 20) return null;
    const hex = (v: number) => Math.round(v / best.n).toString(16).padStart(2, "0");
    return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`.toUpperCase();
  } catch {
    return null;
  }
}

const MODE_ICONS: Record<LandingMode, LucideIcon> = { completa: Rocket, rapida: Zap, texto: PenLine, prompts: WandSparkles };
const SUBMIT_LABEL: Record<LandingMode, string> = {
  completa: "Crear mi landing completa",
  rapida: "Crear mi landing rápida",
  texto: "Crear título y descripción",
  prompts: "Crear mis prompts",
};

function Step({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{n}</span>
        {title}
      </h3>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </section>
  );
}

export function LandingForm({ userId, points, costs }: { userId: string; points: PointsBalance; costs: { completa: number; text: number } }) {
  const [state, action, pending] = useActionState<LandingState, FormData>(createLanding, null);
  const [mode, setMode] = useState<LandingMode>("completa");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [gif, setGif] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [storeName, setStoreName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [fromPhoto, setFromPhoto] = useState<string | null>(null);
  const [colorTouched, setColorTouched] = useState(false);
  const [productName, setProductName] = useState("");
  const [country, setCountry] = useState("Colombia");

  useEffect(() => {
    setStoreName(loadLocal<string>("md-store-name") ?? "");
    const saved = loadLocal<LandingMode>("md-mode");
    if (saved && LANDING_MODES.some((m) => m.id === saved)) setMode(saved);
  }, []);

  function pickMode(m: LandingMode) {
    setMode(m);
    saveLocal("md-mode", m);
  }

  async function addPhotos(files: FileList | null) {
    setLocalError("");
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") && f.type !== "image/gif");
    if (!list.length) return setLocalError("Sube fotos en JPG, PNG o WEBP.");
    const first = !photos.length;
    setPhotos((prev) => [...prev, ...list.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
    if (first) {
      const suggested = await suggestColor(list[0]);
      setFromPhoto(suggested);
      if (suggested && !colorTouched) setColor(suggested);
    }
  }

  function pickGif(f: File | undefined) {
    setLocalError("");
    if (!f) return setGif(null);
    if (f.type !== "image/gif") return setLocalError("El GIF debe ser un archivo .gif");
    if (f.size > MAX_GIF_MB * 1024 * 1024) return setLocalError(`El GIF no puede pesar más de ${MAX_GIF_MB} MB.`);
    setGif(f);
  }

  function chooseColor(c: string) {
    setColor(c.toUpperCase());
    setColorTouched(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");
    if (!photos.length) return setLocalError("Sube al menos una foto del producto.");
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    fd.set("mode", mode);
    saveLocal("md-store-name", String(fd.get("store_name") ?? ""));
    setUploading(true);
    const supabase = createClient();
    const stamp = Date.now();
    try {
      for (const [i, p] of photos.entries()) {
        const path = `${userId}/in/${stamp}-${i + 1}.jpg`;
        const { error } = await supabase.storage.from(LANDING_BUCKET).upload(path, await shrinkImage(p.file), { contentType: "image/jpeg" });
        if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
        fd.append("photo_paths", path);
      }
      if (gif) {
        const path = `${userId}/in/${stamp}-uso.gif`;
        const { error } = await supabase.storage.from(LANDING_BUCKET).upload(path, gif, { contentType: "image/gif" });
        if (error) throw new Error(`No se pudo subir el GIF: ${error.message}`);
        fd.set("gif_path", path);
      }
    } catch (err) {
      setUploading(false);
      return setLocalError((err as Error).message);
    }
    setUploading(false);
    startTransition(() => action(fd));
  }

  const busy = uploading || pending;
  const costOf = (m: LandingMode) => (m === "completa" ? costs.completa : costs.text);
  const cost = costOf(mode);
  const info = LANDING_MODES.find((m) => m.id === mode)!;
  const canAfford = points.balance === null || points.balance >= cost;
  const swatches = [...new Set([...(fromPhoto ? [fromPhoto] : []), ...BRAND_COLORS])];

  return (
    <form onSubmit={onSubmit} className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-zinc-900"><Sparkles className="size-4 text-brand" /> Nueva landing</h2>
          <p className="text-xs text-zinc-500">Llena 4 datos y la IA hace el resto.</p>
        </div>
        {points.balance !== null ? (
          <span className="chip bg-white text-brand shadow-sm ring-1 ring-brand/20" title="Puntos de IA de este mes">
            {points.balance} pts
          </span>
        ) : (
          <span className="chip bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">Sin límite</span>
        )}
      </div>

      <div className="space-y-6 p-5">
        <Step n={1} title="¿Qué quieres crear?">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato">
            {LANDING_MODES.map((m) => {
              const Icon = MODE_ICONS[m.id];
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickMode(m.id)}
                  disabled={busy}
                  className={`relative flex flex-col rounded-xl border p-3 text-left transition ${
                    active ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {active && <Check className="absolute top-2 right-2 size-4 text-brand" />}
                  <Icon className={`size-5 ${active ? "text-brand" : "text-zinc-400"}`} />
                  <span className="mt-1.5 text-sm leading-tight font-semibold text-zinc-900">{m.title}</span>
                  <span className="mt-0.5 text-[11px] leading-snug text-zinc-500">{m.desc}</span>
                  <span className="mt-2 text-[11px] font-semibold text-zinc-700">
                    {points.balance === null ? m.time : `${costOf(m.id)} pts · ${m.time}`}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={2} title="Foto de tu producto" hint="Una foto clara basta (la del proveedor sirve). Puedes subir hasta 3.">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.preview} className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Quitar foto"
                  disabled={busy}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center text-xs text-zinc-500 transition hover:border-brand hover:bg-brand/5">
                <ImagePlus className="size-6 text-zinc-400" />
                {photos.length ? "Otra (opcional)" : "Subir foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} disabled={busy} />
              </label>
            )}
          </div>
        </Step>

        <Step n={3} title="Tu producto">
          <input
            id="product"
            name="product"
            maxLength={120}
            className="input"
            placeholder="Nombre del producto (ej: Faja reductora de cintura)"
            aria-label="Nombre del producto"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            maxLength={2000}
            className="input"
            aria-label="Descripción del producto"
            placeholder="Qué es, qué problema resuelve, de qué está hecho, cómo se usa y qué incluye"
          />
          <details className="group rounded-xl bg-brand/5 p-3 text-xs text-zinc-700">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-900">
              ¿No sabes qué escribir? Sácala con IA en 1 minuto
              <ChevronDown className="size-4 transition group-open:rotate-180" />
            </summary>
            <ol className="mt-2 list-decimal space-y-0.5 pl-4">
              <li>Escribe arriba el nombre del producto (el país es {country}).</li>
              <li>Copia el prompt y pégalo en ChatGPT o Gemini con la búsqueda en internet activada (puedes adjuntar la foto).</li>
              <li>Pega en la descripción lo que te responda.</li>
            </ol>
            <div className="mt-2">
              <CopyButton text={descriptionPrompt(productName, country)} label="Copiar prompt" />
            </div>
          </details>
        </Step>

        <Step n={4} title="Tu oferta">
          <div className="grid grid-cols-2 gap-2">
            <input name="price" required maxLength={40} className="input" placeholder="Precio hoy: $79.900" aria-label="Precio de venta" />
            <input name="compare_price" maxLength={40} className="input" placeholder="Precio antes: $159.900" aria-label="Precio antes" />
          </div>
          <input name="offer" maxLength={200} className="input" placeholder="Envío gratis + pago contra entrega + regalo" aria-label="Oferta" />
        </Step>

        <Step
          n={5}
          title="Color de tu página"
          hint={`${fromPhoto ? "El primer color sale de tu producto. " : ""}Se usa en los sellos, franjas y detalles de la landing.`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => chooseColor(c)}
                className={`flex size-9 items-center justify-center rounded-full border-2 border-white shadow transition ${color === c ? "ring-2 ring-zinc-900 ring-offset-1" : "ring-1 ring-zinc-200"}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
                title={c === fromPhoto ? "Color de tu producto" : c}
              >
                {color === c && <Check className="size-4 text-white drop-shadow" />}
              </button>
            ))}
            <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-zinc-300 text-xs text-zinc-500" title="Otro color">
              +
              <input type="color" value={color} onChange={(e) => chooseColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Otro color" />
            </label>
          </div>
        </Step>

        <details className="group rounded-xl border border-zinc-200">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-700">
            Más opciones <span className="font-normal text-zinc-400">(país, cliente, tienda, reseñas, GIF)</span>
            <ChevronDown className="size-4 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-zinc-100 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="country">País</label>
                <select id="country" name="country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="audience">Cliente ideal</label>
                <select id="audience" name="audience" className="input" defaultValue="">
                  <option value="">Que decida la IA</option>
                  {AUDIENCES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="store_name">Nombre de tu tienda</label>
              <input id="store_name" name="store_name" maxLength={60} className="input" placeholder="Ej: NuxVerse Store" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="reviews">Reseñas reales de tus clientes</label>
              <textarea id="reviews" name="reviews" rows={3} maxLength={4000} className="input" placeholder={"Una por línea: Nombre, Ciudad: comentario\nMaría, Cali: Me llegó rápido y me encantó"} />
              <p className="mt-1 text-xs text-zinc-500">Si las pegas, se arma una imagen con sus comentarios. Solo reseñas reales de tus clientes.</p>
            </div>
            <div>
              <p className="label">GIF del producto en uso</p>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 hover:border-brand">
                <ImagePlus className="size-4 text-zinc-400" />
                <span className="truncate">{gif ? gif.name : `Sube un .gif real del producto (máx. ${MAX_GIF_MB} MB)`}</span>
                <input type="file" accept="image/gif" className="sr-only" onChange={(e) => pickGif(e.target.files?.[0])} disabled={busy} />
              </label>
            </div>
          </div>
        </details>
      </div>

      <div className="space-y-2 border-t border-zinc-100 bg-zinc-50/70 p-5">
        <FormMessage error={localError || state?.error} />
        <button type="submit" disabled={busy || !canAfford} className="btn btn-primary w-full py-3 text-base">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {uploading ? "Subiendo fotos..." : pending ? "Enviando a la IA..." : `${SUBMIT_LABEL[mode]}${points.balance === null ? "" : ` · ${cost} pts`}`}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Tarda {info.time.replace("~", "unos ")}.
          {points.balance === null
            ? " Tú no gastas puntos."
            : ` Te quedan ${points.balance} de ${points.allowance} puntos este mes${canAfford ? "" : " (no te alcanza para este formato; se recargan el día 1)"}.`}
        </p>
      </div>
    </form>
  );
}
