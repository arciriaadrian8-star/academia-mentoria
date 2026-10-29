"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { Film, Loader2, Sparkles, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, VIDEO_FORMATS } from "@/lib/kit";
import { safeFileName } from "@/lib/utils";
import { FormMessage } from "@/components/FormMessage";
import { createScript, type ScriptState } from "./actions";

const MAX_MB = 60;
const MAX_SECONDS = 90;

function videoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration);
    };
    v.onerror = () => resolve(NaN);
    v.src = URL.createObjectURL(file);
  });
}

export function VideoScriptForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<ScriptState, FormData>(createScript, null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");
  const pathRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function pick(f: File | undefined) {
    setLocalError("");
    setFile(null);
    if (!f) return;
    if (!f.type.startsWith("video/")) return setLocalError("El archivo debe ser un video (MP4 o MOV).");
    if (f.size > MAX_MB * 1024 * 1024) return setLocalError(`El video no puede pesar más de ${MAX_MB} MB.`);
    const d = await videoDuration(f);
    if (Number.isFinite(d) && d > MAX_SECONDS) return setLocalError("El video no puede durar más de 90 segundos. Recorta solo el anuncio.");
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");
    if (!file) return setLocalError("Sube el video ganador.");
    const form = e.currentTarget;
    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("ai-videos").upload(path, file, { contentType: file.type || "video/mp4" });
    setUploading(false);
    if (error) return setLocalError(`No se pudo subir el video: ${error.message}`);
    if (pathRef.current) pathRef.current.value = path;
    const fd = new FormData(form);
    fd.set("video_path", path);
    startTransition(() => action(fd));
  }

  const busy = uploading || pending;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand" /> Nuevo guion con IA</h2>

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center ${file ? "border-emerald-300 bg-emerald-50" : "border-zinc-300 bg-zinc-50 hover:border-brand"}`}
      >
        {file ? <Film className="size-8 text-emerald-600" /> : <Upload className="size-8 text-zinc-400" />}
        <span className="text-sm font-semibold">{file ? file.name : "Sube el video ganador de referencia"}</span>
        <span className="text-xs text-zinc-500">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `MP4 o MOV · máx. ${MAX_MB} MB y 90 segundos`}</span>
        <input type="file" accept="video/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
      </label>

      <input ref={pathRef} type="hidden" name="video_path" />
      <div>
        <label className="label" htmlFor="product">Nombre de tu producto</label>
        <input id="product" name="product" required maxLength={120} className="input" placeholder="Ej: Corrector de postura" />
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción</label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          maxLength={1500}
          className="input"
          placeholder="Qué es, qué problema resuelve, para quién es y qué lo hace especial"
        />
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
          <label className="label" htmlFor="price">Precio</label>
          <input id="price" name="price" maxLength={40} className="input" placeholder="$89.900" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="offer">Oferta</label>
        <input id="offer" name="offer" maxLength={200} className="input" placeholder="2x1 + envío gratis + pago al recibir" />
      </div>
      <div>
        <label className="label" htmlFor="format">Formato del nuevo video</label>
        <select id="format" name="format" className="input" defaultValue="mismo">
          {VIDEO_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      <FormMessage error={localError || state?.error} />
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy && <Loader2 className="size-4 animate-spin" />}
        {uploading ? "Subiendo video..." : pending ? "Enviando a la IA..." : "Analizar y crear mi guion"}
      </button>
      <p className="text-xs text-zinc-500">La IA tarda entre 30 segundos y 2 minutos. El video se borra apenas termina el análisis. Máximo 5 por día.</p>
    </form>
  );
}
