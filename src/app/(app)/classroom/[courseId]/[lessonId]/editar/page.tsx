import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { Lesson, LessonFile, Module } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteLesson, deleteLessonFile, updateLesson } from "../../../actions";
import { FileUploader } from "../../../FileUploader";
import { VideoField } from "../../../VideoField";

export default async function EditLessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const { supabase } = await requireStaff();

  const [lessonRes, modulesRes, filesRes] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).eq("course_id", courseId).maybeSingle(),
    supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
    supabase.from("lesson_files").select("*").eq("lesson_id", lessonId).order("created_at"),
  ]);
  const lesson = lessonRes.data as Lesson | null;
  if (!lesson) notFound();
  const modules = (modulesRes.data ?? []) as Module[];
  const files = (filesRes.data ?? []) as LessonFile[];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/classroom/${courseId}/editar`} className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Volver al curso
      </Link>
      <PageHeader title="Editar lección">
        <Link href={`/classroom/${courseId}/${lessonId}`} className="btn btn-secondary">Ver lección</Link>
      </PageHeader>

      <form action={updateLesson} className="card space-y-6 p-6">
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="course_id" value={courseId} />

        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div>
            <label className="label" htmlFor="title">Título</label>
            <input id="title" name="title" required defaultValue={lesson.title} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="module_id">Módulo</label>
            <select id="module_id" name="module_id" defaultValue={lesson.module_id} className="input">
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="label">Vídeo</span>
          <VideoField courseId={courseId} lessonId={lessonId} defaultUrl={lesson.video_url} defaultPath={lesson.video_path} />
        </div>

        <div>
          <label className="label" htmlFor="content">Contenido / notas de la lección</label>
          <textarea
            id="content"
            name="content"
            rows={14}
            defaultValue={lesson.content ?? ""}
            className="input font-mono text-[13px] leading-relaxed"
            placeholder={"## Lo que aprenderás\n\n- Punto 1\n- Punto 2\n\n**Tarea:** escribe tus objetivos en la comunidad."}
          />
          <p className="hint">
            Formato: <code>## Título</code>, <code>**negrita**</code>, <code>- listas</code>, <code>[texto](https://enlace.com)</code>.
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={lesson.published} className="mt-0.5 accent-brand" />
          <span>
            <span className="font-medium">Publicada</span>
            <span className="block text-xs text-zinc-500">Desmárcalo para guardarla como borrador.</span>
          </span>
        </label>

        <div className="flex justify-end">
          <SubmitButton pendingText="Guardando...">Guardar lección</SubmitButton>
        </div>
      </form>

      <section className="card mt-6 space-y-4 p-6">
        <div>
          <h2 className="font-semibold">Recursos descargables</h2>
          <p className="text-sm text-zinc-500">Los miembros podrán descargarlos desde la lección.</p>
        </div>
        {files.length > 0 && (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <FileText className="size-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-zinc-400">{formatBytes(file.size)}</span>
                <form action={deleteLessonFile}>
                  <input type="hidden" name="id" value={file.id} />
                  <ConfirmButton message={`¿Borrar «${file.name}»?`} className="btn-sm border-0 px-1.5" title="Borrar archivo">
                    <Trash2 className="size-3.5" />
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <FileUploader courseId={courseId} lessonId={lessonId} />
      </section>

      <form action={deleteLesson} className="card mt-6 flex items-center justify-between gap-3 p-5">
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="course_id" value={courseId} />
        <p className="text-sm text-zinc-500">Borrar esta lección y sus archivos.</p>
        <ConfirmButton message={`¿Borrar la lección «${lesson.title}»?`}>
          <Trash2 className="size-4" /> Borrar lección
        </ConfirmButton>
      </form>
    </div>
  );
}
