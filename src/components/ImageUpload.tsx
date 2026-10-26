"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/utils";

/** Sube una imagen al bucket público y guarda su URL en un input oculto (name). */
export function ImageUpload({
  name,
  folder,
  defaultUrl,
  shape = "wide",
}: {
  name: string;
  folder: string;
  defaultUrl?: string | null;
  shape?: "wide" | "round" | "square";
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("El archivo debe ser una imagen.");
    if (file.size > 5 * 1024 * 1024) return setError("La imagen no puede pesar más de 5 MB.");
    setError("");
    setUploading(true);
    const supabase = createClient();
    const path = `${folder}/${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (uploadError) return setError(`No se pudo subir: ${uploadError.message}`);
    setUrl(supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl);
  }

  const previewClass =
    shape === "round" ? "size-20 rounded-full" : shape === "square" ? "size-20 rounded-xl" : "aspect-video w-full max-w-sm rounded-xl";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <input type="hidden" name={name} value={url} />
      <div className={`${previewClass} relative flex items-center justify-center overflow-hidden border border-dashed border-zinc-300 bg-zinc-50`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-zinc-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-5 animate-spin text-brand" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {url ? "Cambiar imagen" : "Subir imagen"}
          </button>
          {url && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUrl("")}>
              <X className="size-3.5" /> Quitar
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
