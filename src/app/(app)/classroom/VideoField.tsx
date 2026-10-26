"use client";

import { useRef, useState } from "react";
import { Link2, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getVideoEmbed } from "@/lib/video";
import { cn, safeFileName } from "@/lib/utils";

export function VideoField({
  courseId,
  lessonId,
  defaultUrl,
  defaultPath,
}: {
  courseId: string;
  lessonId: string;
  defaultUrl: string | null;
  defaultPath: string | null;
}) {
  const [mode, setMode] = useState<"url" | "upload">(defaultPath ? "upload" : "url");
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [path, setPath] = useState(defaultPath ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setError("El archivo debe ser un vídeo (mp4, mov, webm...).");
    setError("");
    setUploading(true);
    const newPath = `${courseId}/${lessonId}/${safeFileName(file.name)}`;
    const { error: uploadError } = await createClient()
      .storage.from("course-files")
      .upload(newPath, file, { contentType: file.type });
    setUploading(false);
    if (uploadError) {
      return setError(
        uploadError.message.toLowerCase().includes("size")
          ? "El vídeo es demasiado grande para tu plan de Supabase. Súbelo a YouTube (oculto) o Vimeo y pega el enlace."
          : `No se pudo subir: ${uploadError.message}`,
      );
    }
    setPath(newPath);
  }

  const embed = mode === "url" ? getVideoEmbed(url) : null;

  return (
    <div>
      <input type="hidden" name="video_url" value={mode === "url" ? url : ""} />
      <input type="hidden" name="video_path" value={mode === "upload" ? path : ""} />

      <div className="mb-3 inline-flex rounded-lg bg-zinc-100 p-1 text-sm">
        {(
          [
            ["url", "Pegar enlace", Link2],
            ["upload", "Subir vídeo", Upload],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium",
              mode === value ? "bg-white shadow-sm" : "text-zinc-500",
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtu.be/... · vimeo.com/... · loom.com/share/..."
            className="input"
          />
          <p className="hint">Funciona con YouTube (puede ser «oculto»), Vimeo, Loom, Google Drive o un enlace .mp4.</p>
          {url && !embed && <p className="mt-1 text-xs text-red-600">Ese enlace no parece válido.</p>}
          {embed?.type === "iframe" && (
            <div className="mt-3 aspect-video max-w-md overflow-hidden rounded-lg bg-black">
              <iframe src={embed.src} className="size-full" allowFullScreen title="Vista previa" />
            </div>
          )}
        </>
      ) : (
        <>
          {path ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{path.split("/").pop()}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPath("")}>
                <X className="size-3.5" /> Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500 hover:border-brand hover:text-brand"
            >
              {uploading ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
              {uploading ? "Subiendo vídeo... no cierres la página" : "Haz clic para elegir un vídeo"}
            </button>
          )}
          <p className="hint">
            Se guarda de forma privada: solo lo ven miembros con acceso. El plan gratuito de Supabase admite archivos de hasta 50 MB;
            para vídeos largos usa YouTube oculto o Vimeo.
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
