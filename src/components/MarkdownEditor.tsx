"use client";

import { useRef, useState } from "react";
import { Bold, ImagePlus, Link2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/utils";

const MAX_IMAGE_MB = 10;

/** Área de texto con formato (Markdown) y subida de imágenes: botón, pegar o arrastrar. */
export function MarkdownEditor({
  name,
  folder,
  defaultValue,
  rows = 8,
  placeholder,
  required,
  id,
}: {
  name: string;
  /** Carpeta en el bucket público donde se guardan las imágenes. */
  folder: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");

  function insert(before: string, after = "", fallback = "") {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const selected = el.value.slice(start, end) || fallback;
    el.setRangeText(`${before}${selected}${after}`, start, end, "end");
    el.focus();
  }

  async function uploadImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setError("");
    const supabase = createClient();
    for (const file of images) {
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`«${file.name}» pesa más de ${MAX_IMAGE_MB} MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      const path = `${folder}/${safeFileName(file.name || "imagen.png")}`;
      const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type });
      setUploading((n) => n - 1);
      if (uploadError) {
        setError(`No se pudo subir la imagen: ${uploadError.message}`);
        continue;
      }
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      const alt = (file.name || "imagen").replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
      insert(`\n![${alt}](${url})\n`);
    }
  }

  return (
    <div>
      <div className="rounded-lg border border-zinc-300 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <div className="flex items-center gap-1 border-b border-zinc-200 px-2 py-1">
          <button type="button" className="btn btn-ghost btn-sm px-2" title="Negrita" onClick={() => insert("**", "**", "texto")}>
            <Bold className="size-3.5" />
          </button>
          <button type="button" className="btn btn-ghost btn-sm px-2" title="Enlace" onClick={() => insert("[", "](https://)", "texto del enlace")}>
            <Link2 className="size-3.5" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={uploading > 0}
            onClick={() => fileRef.current?.click()}
          >
            {uploading > 0 ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {uploading > 0 ? "Subiendo..." : "Imagen"}
          </button>
        </div>
        <textarea
          ref={textRef}
          id={id}
          name={name}
          rows={rows}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="block w-full resize-y rounded-b-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.some((f) => f.type.startsWith("image/"))) {
              e.preventDefault();
              uploadImages(files);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length) {
              e.preventDefault();
              uploadImages(files);
            }
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          uploadImages(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
