import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, FileVideo, Pencil, Plus, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { AccessLevel, Course, Lesson, Module } from "@/lib/types";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormMessage } from "@/components/FormMessage";
import { ImageUpload } from "@/components/ImageUpload";
import { LevelPicker } from "@/components/LevelPicker";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import {
  createLesson,
  createModule,
  deleteCourse,
  deleteModule,
  moveLesson,
  moveModule,
  renameModule,
  updateCourse,
} from "../../actions";

function MoveButtons({ action, hidden, first, last }: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  first: boolean;
  last: boolean;
}) {
  return (
    <>
      {(["up", "down"] as const).map((direction) => (
        <form key={direction} action={action}>
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="hidden" name="direction" value={direction} />
          <button
            className="btn btn-ghost btn-sm px-1.5"
            disabled={direction === "up" ? first : last}
            title={direction === "up" ? "Subir" : "Bajar"}
          >
            {direction === "up" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          </button>
        </form>
      ))}
    </>
  );
}

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { courseId } = await params;
  const { guardado } = await searchParams;
  const { supabase } = await requireStaff();

  const [courseRes, levelsRes, accessRes, modulesRes, lessonsRes] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
    supabase.from("access_levels").select("*").order("name"),
    supabase.from("course_access").select("access_level_id").eq("course_id", courseId),
    supabase.from("modules").select("*").eq("course_id", courseId).order("position").order("created_at"),
    supabase.from("lessons").select("*").eq("course_id", courseId).order("position").order("created_at"),
  ]);
  const course = courseRes.data as Course | null;
  if (!course) notFound();
  const levels = (levelsRes.data ?? []) as AccessLevel[];
  const selectedLevels = (accessRes.data ?? []).map((r) => r.access_level_id as string);
  const modules = (modulesRes.data ?? []) as Module[];
  const lessons = (lessonsRes.data ?? []) as Lesson[];

  return (
    <>
      <PageHeader title={course.title} description="Organiza el curso en módulos y lecciones.">
        <Link href={`/classroom/${courseId}`} className="btn btn-secondary">
          <Eye className="size-4" /> Ver como alumno
        </Link>
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* CONTENIDO */}
        <section className="space-y-4">
          {modules.length === 0 && (
            <div className="card p-6 text-sm text-zinc-500">
              <p className="font-semibold text-zinc-800">Empieza creando un módulo</p>
              <p className="mt-1">Ej: «Módulo 1 · Bienvenida». Dentro de cada módulo añadirás las lecciones (vídeo + texto + archivos).</p>
            </div>
          )}

          {modules.map((module, mIndex) => {
            const moduleLessons = lessons.filter((l) => l.module_id === module.id);
            return (
              <div key={module.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                  <form action={renameModule} className="flex min-w-0 flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={module.id} />
                    <input type="hidden" name="course_id" value={courseId} />
                    <input
                      name="title"
                      defaultValue={module.title}
                      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold hover:border-zinc-300 focus:border-brand focus:bg-white focus:outline-none"
                    />
                    <SubmitButton className="btn-sm btn-secondary">Guardar</SubmitButton>
                  </form>
                  <div className="flex items-center">
                    <MoveButtons
                      action={moveModule}
                      hidden={{ id: module.id, course_id: courseId }}
                      first={mIndex === 0}
                      last={mIndex === modules.length - 1}
                    />
                    <form action={deleteModule}>
                      <input type="hidden" name="id" value={module.id} />
                      <input type="hidden" name="course_id" value={courseId} />
                      <ConfirmButton
                        message={`¿Borrar el módulo «${module.title}» y TODAS sus lecciones? No se puede deshacer.`}
                        className="btn-ghost btn-sm border-0 px-1.5"
                        title="Borrar módulo"
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmButton>
                    </form>
                  </div>
                </div>

                <ul className="divide-y divide-zinc-100">
                  {moduleLessons.map((lesson, lIndex) => (
                    <li key={lesson.id} className="flex items-center gap-2 px-4 py-2.5">
                      <FileVideo className="size-4 shrink-0 text-zinc-400" />
                      <Link
                        href={`/classroom/${courseId}/${lesson.id}/editar`}
                        className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand"
                      >
                        {lesson.title}
                      </Link>
                      {!lesson.published && <span className="chip bg-amber-100 text-amber-800">Borrador</span>}
                      <MoveButtons
                        action={moveLesson}
                        hidden={{ id: lesson.id, course_id: courseId, module_id: module.id }}
                        first={lIndex === 0}
                        last={lIndex === moduleLessons.length - 1}
                      />
                      <Link href={`/classroom/${courseId}/${lesson.id}/editar`} className="btn btn-ghost btn-sm px-1.5" title="Editar">
                        <Pencil className="size-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <form action={createLesson} className="flex gap-2 border-t border-zinc-100 px-4 py-3">
                  <input type="hidden" name="course_id" value={courseId} />
                  <input type="hidden" name="module_id" value={module.id} />
                  <input name="title" required placeholder="Título de la nueva lección" className="input py-1.5" />
                  <SubmitButton className="btn-sm btn-secondary shrink-0">
                    <Plus className="size-3.5" /> Lección
                  </SubmitButton>
                </form>
              </div>
            );
          })}

          <form action={createModule} className="card flex gap-2 p-4">
            <input type="hidden" name="course_id" value={courseId} />
            <input name="title" required placeholder="Nombre del nuevo módulo" className="input" />
            <SubmitButton className="shrink-0">
              <Plus className="size-4" /> Añadir módulo
            </SubmitButton>
          </form>
        </section>

        {/* AJUSTES DEL CURSO */}
        <aside className="space-y-4">
          <form action={updateCourse} className="card space-y-5 p-5">
            <h2 className="font-semibold">Ajustes del curso</h2>
            {guardado && <FormMessage success="Cambios guardados." />}
            <input type="hidden" name="id" value={course.id} />
            <div>
              <label className="label" htmlFor="title">Título</label>
              <input id="title" name="title" required defaultValue={course.title} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="description">Descripción</label>
              <textarea id="description" name="description" rows={3} defaultValue={course.description ?? ""} className="input" />
            </div>
            <div>
              <span className="label">Portada (16:9)</span>
              <ImageUpload name="cover_url" folder="covers" defaultUrl={course.cover_url} />
            </div>
            <div>
              <span className="label">¿Quién tiene acceso?</span>
              <LevelPicker
                levels={levels}
                selected={selectedLevels}
                emptyHint="Si no marcas ningún nivel, lo verán todos los miembros."
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={course.published} className="mt-0.5 accent-brand" />
                <span>
                  <span className="font-medium">Publicado</span>
                  <span className="block text-xs text-zinc-500">Si no, solo lo ven admins y coaches.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="show_locked" defaultChecked={course.show_locked} className="mt-0.5 accent-brand" />
                <span>
                  <span className="font-medium">Mostrar con candado a quien no tiene acceso</span>
                  <span className="block text-xs text-zinc-500">Útil para que vean qué más pueden desbloquear.</span>
                </span>
              </label>
            </div>
            <SubmitButton className="w-full" pendingText="Guardando...">Guardar cambios</SubmitButton>
          </form>

          <form action={deleteCourse} className="card flex items-center justify-between gap-3 p-5">
            <input type="hidden" name="id" value={course.id} />
            <p className="text-sm text-zinc-500">Borrar el curso, sus lecciones y archivos.</p>
            <ConfirmButton message={`¿Seguro que quieres borrar «${course.title}»? No se puede deshacer.`}>
              <Trash2 className="size-4" /> Borrar
            </ConfirmButton>
          </form>
        </aside>
      </div>
    </>
  );
}
