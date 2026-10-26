import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Download, FileText, Pencil } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { Course, Lesson, LessonFile, Module } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import { SubmitButton } from "@/components/SubmitButton";
import { toggleComplete } from "../../actions";
import { VideoPlayer } from "../../VideoPlayer";

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const { supabase, user, isStaff } = await requireActive();

  const [courseRes, modulesRes, lessonsRes, progressRes, filesRes] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
    supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("course_id", courseId).eq("user_id", user.id),
    supabase.from("lesson_files").select("*").eq("lesson_id", lessonId).order("created_at"),
  ]);

  const course = courseRes.data as Course | null;
  const modules = (modulesRes.data ?? []) as Module[];
  const lessons = (lessonsRes.data ?? []) as Lesson[];
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!course || !lesson) notFound();

  const done = new Set((progressRes.data ?? []).map((p) => p.lesson_id as string));
  const visible = (l: Lesson) => l.published || isStaff;
  const ordered = modules.flatMap((m) => lessons.filter((l) => l.module_id === m.id && visible(l)));
  const index = ordered.findIndex((l) => l.id === lessonId);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  const publishedCount = ordered.filter((l) => l.published).length;
  const completedCount = ordered.filter((l) => l.published && done.has(l.id)).length;
  const percent = publishedCount ? Math.round((completedCount / publishedCount) * 100) : 0;
  const isDone = done.has(lessonId);

  // Enlaces temporales y privados para el vídeo subido y los archivos.
  const files = (filesRes.data ?? []) as LessonFile[];
  const [videoSigned, filesSigned] = await Promise.all([
    lesson.video_path ? supabase.storage.from("course-files").createSignedUrl(lesson.video_path, 60 * 60 * 6) : null,
    files.length ? supabase.storage.from("course-files").createSignedUrls(files.map((f) => f.path), 60 * 60, { download: true }) : null,
  ]);
  const fileUrls = new Map((filesSigned?.data ?? []).map((s) => [s.path, s.signedUrl]));

  const outline = (
    <nav className="space-y-4">
      {modules.map((module) => {
        const moduleLessons = lessons.filter((l) => l.module_id === module.id && visible(l));
        if (moduleLessons.length === 0) return null;
        return (
          <div key={module.id}>
            <p className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{module.title}</p>
            <ul className="space-y-0.5">
              {moduleLessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/classroom/${courseId}/${l.id}`}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2 py-2 text-sm",
                      l.id === lessonId ? "bg-brand/10 font-semibold text-zinc-900" : "text-zinc-600 hover:bg-zinc-100",
                    )}
                  >
                    {done.has(l.id) ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-zinc-300" />
                    )}
                    <span className="min-w-0 flex-1">{l.title}</span>
                    {!l.published && <span className="chip bg-amber-100 text-amber-800">Borrador</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        <div className="card p-4">
          <Link href="/classroom" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Classroom
          </Link>
          <h2 className="mt-2 font-bold">{course.title}</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-medium text-zinc-500">{percent}% completado</p>
          <details className="mt-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-brand">Ver todas las lecciones</summary>
            <div className="mt-3">{outline}</div>
          </details>
          <div className="mt-4 hidden lg:block">{outline}</div>
        </div>
      </aside>

      <article className="card min-w-0 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          {isStaff && (
            <Link href={`/classroom/${courseId}/${lessonId}/editar`} className="btn btn-secondary btn-sm">
              <Pencil className="size-3.5" /> Editar lección
            </Link>
          )}
        </div>

        {(lesson.video_url || videoSigned?.data) && (
          <div className="mt-6">
            <VideoPlayer url={lesson.video_url} fileUrl={videoSigned?.data?.signedUrl} />
          </div>
        )}

        <Markdown className="mt-6">{lesson.content}</Markdown>

        {files.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Recursos descargables</h3>
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
              {files.map((file) => (
                <li key={file.id}>
                  <a
                    href={fileUrls.get(file.path) ?? "#"}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                  >
                    <FileText className="size-5 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                    <span className="text-xs text-zinc-400">{formatBytes(file.size)}</span>
                    <Download className="size-4 text-zinc-400" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-6">
          {lesson.published ? (
            <form action={toggleComplete}>
              <input type="hidden" name="lesson_id" value={lessonId} />
              <input type="hidden" name="course_id" value={courseId} />
              <input type="hidden" name="completed" value={isDone ? "1" : "0"} />
              <SubmitButton className={isDone ? "bg-emerald-500" : ""}>
                <CheckCircle2 className="size-4" />
                {isDone ? "Completada" : "Marcar como completada"}
              </SubmitButton>
            </form>
          ) : (
            <span className="text-sm text-amber-700">Esta lección es un borrador: los miembros no la ven.</span>
          )}
          <div className="flex gap-2">
            {prev && (
              <Link href={`/classroom/${courseId}/${prev.id}`} className="btn btn-secondary">
                <ArrowLeft className="size-4" /> Anterior
              </Link>
            )}
            {next && (
              <Link href={`/classroom/${courseId}/${next.id}`} className="btn btn-secondary">
                Siguiente <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
