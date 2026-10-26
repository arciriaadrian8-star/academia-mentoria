import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { Lesson, Module } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/PageHeader";

/** Abre el curso en la primera lección pendiente. */
export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase, user, isStaff } = await requireActive();

  const { data: course } = await supabase.from("courses").select("id, title, description").eq("id", courseId).maybeSingle();
  if (!course) notFound();

  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    supabase.from("modules").select("id, position").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select("id, module_id, position, published").eq("course_id", courseId).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("course_id", courseId).eq("user_id", user.id),
  ]);
  const modules = (modulesRes.data ?? []) as Pick<Module, "id" | "position">[];
  const lessons = (lessonsRes.data ?? []) as Pick<Lesson, "id" | "module_id" | "position" | "published">[];
  const done = new Set((progressRes.data ?? []).map((p) => p.lesson_id as string));

  const ordered = modules.flatMap((m) => lessons.filter((l) => l.module_id === m.id && (l.published || isStaff)));
  const target = ordered.find((l) => !done.has(l.id)) ?? ordered[0];
  if (target) redirect(`/classroom/${courseId}/${target.id}`);

  const { data: canView } = await supabase.rpc("can_view_course", { cid: courseId });

  return (
    <>
      <PageHeader title={course.title} description={course.description}>
        {isStaff && (
          <Link href={`/classroom/${courseId}/editar`} className="btn btn-primary">Editar curso</Link>
        )}
      </PageHeader>
      {canView ? (
        <EmptyState title="Este curso aún no tiene lecciones">
          {isStaff ? "Entra en «Editar curso» para añadir módulos y lecciones." : "Vuelve pronto: el contenido está en preparación."}
        </EmptyState>
      ) : (
        <EmptyState icon={<Lock className="size-10" />} title="Contenido bloqueado">
          Este curso no está incluido en tu plan. Habla con tu mentor para desbloquearlo.
        </EmptyState>
      )}
    </>
  );
}
