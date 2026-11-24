"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Check, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, loadLocal, saveLocal } from "@/lib/kit";
import { AUDIENCES, BRAND_COLORS, DEFAULT_COLOR, descriptionPrompt, LANDING_BUCKET, type PointsBalance } from "@/lib/landing";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { createLanding, type LandingState } from "./actions";

const MAX_PHOTOS = 3;
const MAX_GIF_MB = 8;

/** Achica la foto a máx. 1280 px y la pasa a JPEG para que suba rápido y la IA la lea bien. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo leer la foto"))), "image/jpeg", 0.88));
}

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

export function LandingForm({ userId, points, cost }: { userId: string; points: PointsBalance; cost: number }) {
  const [state, action, pending] = useActionState<LandingState, FormData>(createLanding, null);
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
  }, []);

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
    saveLocal("md-store-name", String(fd.get("store_name") ?? ""));
    setUploading(true);
    const supabase = createClient();
    const stamp = Date.now();
    try {
      for (const [i, p] of photos.entries()) {
        const path = `${userId}/in/${stamp}-${i + 1}.jpg`;
        const { error } = await supabase.storage.from(LANDING_BUCKET).upload(path, await shrink(p.file), { contentType: "image/jpeg" });
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
  const canAfford = points.balance === null || points.balance >= cost;
  const swatches = [...new Set([...(fromPhoto ? [fromPhoto] : []), ...BRAND_COLORS])];

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand" /> Nueva landing</h2>
        {points.balance !== null && (
          <span className="chip bg-brand/10 text-brand" title="Puntos de IA de este mes">
            {points.balance} pts
          </span>
        )}
      </div>

      {/* 1. Foto */}
      <div>
        <p className="label">1. Foto de tu producto</p>
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
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center text-xs text-zinc-500 hover:border-brand">
              <ImagePlus className="size-6 text-zinc-400" />
              {photos.length ? "Otra (opcional)" : "Subir foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} disabled={busy} />
            </label>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Una foto clara basta (la del proveedor sirve). Puedes subir hasta 3.</p>
      </div>

      {/* 2. Descripción */}
      <div>
        <label className="label" htmlFor="product">2. Nombre del producto</label>
        <input
          id="product"
          name="product"
          maxLength={120}
          className="input"
          placeholder="Ej: Faja reductora de cintura"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="description">3. Descripción del producto</label>
        <div className="mb-2 rounded-xl bg-brand/5 p-3 text-xs text-zinc-700">
          <p className="font-semibold text-zinc-900">¿No sabes qué escribir? Sácala con IA en 1 minuto:</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Escribe arriba el nombre del producto (el país es {country}).</li>
            <li>Copia el prompt y pégalo en ChatGPT o Gemini con la búsqueda en internet activada (puedes adjuntar la foto).</li>
            <li>Pega aquí abajo lo que te responda.</li>
          </ol>
          <div className="mt-2">
            <CopyButton text={descriptionPrompt(productName, country)} label="Copiar prompt" />
          </div>
        </div>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          maxLength={2000}
          className="input"
          placeholder="Qué es, qué problema resuelve, de qué está hecho, cómo se usa y qué incluye"
        />
      </div>

      {/* 4. Oferta */}
      <div>
        <p className="label">4. Tu oferta</p>
        <div className="grid grid-cols-2 gap-3">
          <input name="price" required maxLength={40} className="input" placeholder="Precio hoy: $79.900" aria-label="Precio de venta" />
          <input name="compare_price" maxLength={40} className="input" placeholder="Precio antes: $159.900" aria-label="Precio antes" />
        </div>
        <input name="offer" maxLength={200} className="input mt-2" placeholder="Envío gratis + pago contra entrega + regalo" aria-label="Oferta" />
      </div>

      {/* 5. Colores */}
      <div>
        <p className="label">5. Color de tu página</p>
        <div className="flex flex-wrap items-center gap-2">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => chooseColor(c)}
              className="flex size-9 items-center justify-center rounded-full border-2 border-white shadow ring-1 ring-zinc-200"
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
        <p className="mt-1 text-xs text-zinc-500">
          {fromPhoto ? "Te sugerimos el primer color: sale de tu producto. " : ""}Se usa en los sellos, franjas y detalles de la landing.
        </p>
      </div>

      <details className="rounded-xl border border-zinc-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-700">Más opciones (opcional)</summary>
        <div className="mt-3 space-y-3">
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

      <FormMessage error={localError || state?.error} />
      <button type="submit" disabled={busy || !canAfford} className="btn btn-primary w-full">
        {busy && <Loader2 className="size-4 animate-spin" />}
        {uploading ? "Subiendo fotos..." : pending ? "Enviando a la IA..." : `Crear mi landing · ${cost} puntos`}
      </button>
      <p className="text-xs text-zinc-500">
        Tarda entre 1 y 2 minutos.
        {points.balance === null
          ? " Tú no gastas puntos."
          : ` Te quedan ${points.balance} de ${points.allowance} puntos este mes${canAfford ? "" : " (no te alcanza; se recargan el día 1)"}.`}
      </p>
    </form>
  );
}
