"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/utils";
import { addLessonFile } from "./actions";

/** Sube recursos descargables (PDF, plantillas, audios...) a una lección. */
export function FileUploader({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const supabase = createClient();
    const files = Array.from(list);
    for (const [i, file] of files.entries()) {
      setStatus(`Subiendo ${i + 1} de ${files.length}: ${file.name}`);
      const path = `${courseId}/${lessonId}/${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("course-files")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) {
        setError(`No se pudo subir «${file.name}»: ${uploadError.message}`);
        continue;
      }
      await addLessonFile({ courseId, lessonId, name: file.name, path, size: file.size });
    }
    setStatus("");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={Boolean(status)}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-5 text-sm font-medium text-zinc-500 hover:border-brand hover:text-brand"
      >
        {status ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        {status || "Añadir archivos (PDF, plantillas, audios...)"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
