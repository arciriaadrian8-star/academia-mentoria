"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, loadLocal, saveLocal } from "@/lib/kit";
import { AUDIENCES, LANDING_BUCKET, LANDING_MONTHLY_LIMIT } from "@/lib/makedrop";
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

export function LandingForm({ userId, used }: { userId: string; used: number | null }) {
  const [state, action, pending] = useActionState<LandingState, FormData>(createLanding, null);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [gif, setGif] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    setStoreName(loadLocal<string>("md-store-name") ?? "");
  }, []);

  function addPhotos(files: FileList | null) {
    setLocalError("");
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") && f.type !== "image/gif");
    if (!list.length) return setLocalError("Sube fotos en JPG, PNG o WEBP.");
    setPhotos((prev) => [...prev, ...list.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
  }

  function pickGif(f: File | undefined) {
    setLocalError("");
    if (!f) return setGif(null);
    if (f.type !== "image/gif") return setLocalError("El GIF debe ser un archivo .gif");
    if (f.size > MAX_GIF_MB * 1024 * 1024) return setLocalError(`El GIF no puede pesar más de ${MAX_GIF_MB} MB.`);
    setGif(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");
    if (!photos.length) return setLocalError("Sube al menos una foto del producto.");
    const fd = new FormData(e.currentTarget);
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
  const left = used === null ? null : Math.max(LANDING_MONTHLY_LIMIT - used, 0);

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand" /> Nueva landing</h2>

      <div>
        <p className="label">Fotos del producto (1 a 3)</p>
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
              Agregar
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} disabled={busy} />
            </label>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Fotos claras del producto (las del proveedor sirven). La IA las usa para que salga idéntico.</p>
      </div>

      <div>
        <label className="label" htmlFor="product">Nombre del producto</label>
        <input id="product" name="product" required maxLength={120} className="input" placeholder="Ej: Gomitas de magnesio para dormir" />
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción del producto</label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          maxLength={2000}
          className="input"
          placeholder="Qué es, qué problema resuelve, de qué está hecho, cómo se usa, qué incluye y para quién es"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="price">Precio de venta</label>
          <input id="price" name="price" required maxLength={40} className="input" placeholder="$79.900" />
        </div>
        <div>
          <label className="label" htmlFor="compare_price">Precio antes</label>
          <input id="compare_price" name="compare_price" maxLength={40} className="input" placeholder="$159.900" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="offer">Tu oferta</label>
        <input id="offer" name="offer" maxLength={200} className="input" placeholder="Envío gratis + pago contra entrega + regalo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="country">País</label>
          <select id="country" name="country" className="input" defaultValue="Colombia">
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
        <label className="label" htmlFor="reviews">Reseñas reales de tus clientes (opcional)</label>
        <textarea
          id="reviews"
          name="reviews"
          rows={3}
          maxLength={4000}
          className="input"
          placeholder={"Una por línea. Ej:\nMaría, Cali: Me llegó rápido y me encantó"}
        />
        <p className="mt-1 text-xs text-zinc-500">Si no pegas ninguna, la IA escribe reseñas de ejemplo con el aviso «Reseñas ilustrativas».</p>
      </div>
      <div>
        <label className="label">GIF del producto en uso (opcional)</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 hover:border-brand">
          <ImagePlus className="size-4 text-zinc-400" />
          <span className="truncate">{gif ? gif.name : `Sube un .gif real del producto (máx. ${MAX_GIF_MB} MB)`}</span>
          <input type="file" accept="image/gif" className="sr-only" onChange={(e) => pickGif(e.target.files?.[0])} disabled={busy} />
        </label>
      </div>

      <FormMessage error={localError || state?.error} />
      <button type="submit" disabled={busy || left === 0} className="btn btn-primary w-full">
        {busy && <Loader2 className="size-4 animate-spin" />}
        {uploading ? "Subiendo fotos..." : pending ? "Enviando a la IA..." : "Crear mi landing"}
      </button>
      <p className="text-xs text-zinc-500">
        Tarda entre 1 y 2 minutos.{left !== null && ` Te quedan ${left} de ${LANDING_MONTHLY_LIMIT} landings este mes.`}
      </p>
    </form>
  );
}
