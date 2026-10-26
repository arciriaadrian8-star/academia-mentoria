import Link from "next/link";
import { ChevronLeft, ChevronRight, GraduationCap, Lock, Pencil, Plus } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { AccessLevel, Course } from "@/lib/types";
import { LevelChips } from "@/components/LevelChips";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { moveCourse } from "./actions";

export default async function ClassroomPage() {
  const { supabase, user, isStaff } = await requireActive();

  const [coursesRes, courseAccessRes, myAccessRes, levelsRes, lessonsRes, progressRes] = await Promise.all([
    supabase.from("courses").select("*").order("position").order("created_at"),
    supabase.from("course_access").select("course_id, access_level_id"),
    supabase.from("member_access").select("access_level_id").eq("user_id", user.id),
    supabase.from("access_levels").select("*").order("name"),
    supabase.from("lessons").select("id, course_id").eq("published", true),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
  ]);

  const courses = (coursesRes.data ?? []) as Course[];
  const courseAccess = courseAccessRes.data ?? [];
  const myLevels = new Set((myAccessRes.data ?? []).map((r) => r.access_level_id as string));
  const levels = (levelsRes.data ?? []) as AccessLevel[];
  const lessons = lessonsRes.data ?? [];
  const done = new Set((progressRes.data ?? []).map((r) => r.lesson_id as string));

  const cards = courses.map((course) => {
    const levelIds = courseAccess.filter((ca) => ca.course_id === course.id).map((ca) => ca.access_level_id as string);
    const hasAccess = isStaff || levelIds.length === 0 || levelIds.some((id) => myLevels.has(id));
    const courseLessons = lessons.filter((l) => l.course_id === course.id);
    const completed = courseLessons.filter((l) => done.has(l.id)).length;
    const percent = courseLessons.length ? Math.round((completed / courseLessons.length) * 100) : 0;
    return {
      course,
      hasAccess,
      percent,
      lessonCount: courseLessons.length,
      levels: levels.filter((level) => levelIds.includes(level.id)),
    };
  });

  return (
    <>
      <PageHeader title="Classroom" description="Tus cursos y programas de la mentoría.">
        {isStaff && (
          <Link href="/classroom/nuevo" className="btn btn-primary">
            <Plus className="size-4" /> Nuevo curso
          </Link>
        )}
      </PageHeader>

      {cards.length === 0 ? (
        <EmptyState icon={<GraduationCap className="size-10" />} title="Todavía no hay cursos">
          {isStaff ? "Crea tu primer curso y añade módulos y lecciones." : "Pronto verás aquí el contenido de tu mentoría."}
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ course, hasAccess, percent, lessonCount, levels: courseLevels }, index) => {
            const body = (
              <>
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-brand to-brand/60">
                  {course.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.cover_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center p-6 text-center text-xl font-bold text-white">
                      {course.title}
                    </div>
                  )}
                  {!hasAccess && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/60 text-white">
                      <Lock className="size-7" />
                      <span className="text-sm font-semibold">Contenido bloqueado</span>
                    </div>
                  )}
                  {isStaff && !course.published && (
                    <span className="chip absolute top-3 left-3 bg-amber-100 text-amber-800">Borrador</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-bold text-zinc-900">{course.title}</h2>
                  {course.description && <p className="mt-1 line-clamp-3 text-sm text-zinc-500">{course.description}</p>}
                  <div className="mt-auto pt-4">
                    {hasAccess ? (
                      <>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs font-medium text-zinc-500">
                          {percent}% completado · {lessonCount} {lessonCount === 1 ? "lección" : "lecciones"}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-medium text-zinc-500">Habla con tu mentor para desbloquear este curso.</p>
                    )}
                  </div>
                </div>
              </>
            );

            return (
              <div key={course.id} className="card flex flex-col overflow-hidden transition hover:shadow-md">
                {hasAccess ? (
                  <Link href={`/classroom/${course.id}`} className="flex flex-1 flex-col">
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-1 flex-col">{body}</div>
                )}
                {isStaff && (
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-2.5">
                    <LevelChips levels={courseLevels} emptyText="Todos los miembros" />
                    <div className="flex shrink-0 items-center">
                      <form action={moveCourse}>
                        <input type="hidden" name="id" value={course.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className="btn btn-ghost btn-sm px-1.5" disabled={index === 0} title="Mover antes">
                          <ChevronLeft className="size-4" />
                        </button>
                      </form>
                      <form action={moveCourse}>
                        <input type="hidden" name="id" value={course.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button className="btn btn-ghost btn-sm px-1.5" disabled={index === cards.length - 1} title="Mover después">
                          <ChevronRight className="size-4" />
                        </button>
                      </form>
                      <Link href={`/classroom/${course.id}/editar`} className="btn btn-ghost btn-sm px-1.5" title="Editar">
                        <Pencil className="size-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
