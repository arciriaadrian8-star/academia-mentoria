import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import type { AccessLevel, Course, Profile, Role } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormMessage } from "@/components/FormMessage";
import { LevelPicker } from "@/components/LevelPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteMember, updateMember } from "../actions";
import { ResetPassword } from "./ResetPassword";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { id } = await params;
  const { guardado } = await searchParams;
  const { supabase, user } = await requireAdmin();

  const [profileRes, levelsRes, accessRes, coursesRes, lessonsRes, progressRes, courseAccessRes] = await Promise.all([
    createAdminClient().from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("access_levels").select("*").order("name"),
    supabase.from("member_access").select("access_level_id").eq("user_id", id),
    supabase.from("courses").select("*").order("position"),
    supabase.from("lessons").select("id, course_id").eq("published", true),
    supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", id).order("completed_at", { ascending: false }),
    supabase.from("course_access").select("course_id, access_level_id"),
  ]);
  const member = profileRes.data as Profile | null;
  if (!member) notFound();
  const levels = (levelsRes.data ?? []) as AccessLevel[];
  const memberLevels = (accessRes.data ?? []).map((a) => a.access_level_id as string);
  const courses = (coursesRes.data ?? []) as Course[];
  const lessons = lessonsRes.data ?? [];
  const progress = progressRes.data ?? [];
  const done = new Set(progress.map((p) => p.lesson_id as string));
  const isSelf = member.id === user.id;

  const courseStats = courses
    .filter((c) => c.published)
    .map((course) => {
      const levelIds = (courseAccessRes.data ?? []).filter((ca) => ca.course_id === course.id).map((ca) => ca.access_level_id);
      const hasAccess = member.role !== "member" || levelIds.length === 0 || levelIds.some((l) => memberLevels.includes(l));
      const courseLessons = lessons.filter((l) => l.course_id === course.id);
      const completed = courseLessons.filter((l) => done.has(l.id)).length;
      return { course, hasAccess, total: courseLessons.length, completed };
    });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/miembros" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Miembros
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={member.full_name || member.email} url={member.avatar_url} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{member.full_name || "Sin nombre"}</h1>
          <p className="text-sm text-zinc-500">{member.email}</p>
        </div>
        <Link href={`/calendario/nuevo?miembro=${member.id}`} className="btn btn-secondary">
          <CalendarPlus className="size-4" /> Agendar sesión 1:1
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form action={updateMember} className="card space-y-5 p-6">
          <h2 className="font-semibold">Acceso</h2>
          {guardado && <FormMessage success="Cambios guardados." />}
          <input type="hidden" name="id" value={member.id} />
          <div>
            <label className="label" htmlFor="full_name">Nombre</label>
            <input id="full_name" name="full_name" defaultValue={member.full_name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="role">Rol</label>
            <select id="role" name="role" defaultValue={member.role} disabled={isSelf} className="input">
              {(["member", "coach", "admin"] as Role[]).map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Niveles de acceso</span>
            <LevelPicker levels={levels} selected={memberLevels} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={member.active} disabled={isSelf} className="mt-0.5 accent-brand" />
            <span>
              <span className="font-medium">Cuenta activa</span>
              <span className="block text-xs text-zinc-500">Desmárcalo para quitarle el acceso sin borrar su cuenta.</span>
            </span>
          </label>
          <SubmitButton className="w-full" pendingText="Guardando...">Guardar</SubmitButton>
        </form>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold">Progreso en los cursos</h2>
            {courseStats.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay cursos publicados.</p>
            ) : (
              <ul className="space-y-4">
                {courseStats.map(({ course, hasAccess, total, completed }) => {
                  const percent = total ? Math.round((completed / total) * 100) : 0;
                  return (
                    <li key={course.id}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{course.title}</span>
                        <span className="shrink-0 text-zinc-500">
                          {hasAccess ? `${completed}/${total} · ${percent}%` : "🔒 Sin acceso"}
                        </span>
                      </div>
                      {hasAccess && (
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {progress[0] && (
              <p className="mt-4 text-xs text-zinc-500">
                Última lección completada: {new Date(progress[0].completed_at).toLocaleDateString("es", { day: "numeric", month: "long" })}
              </p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Contraseña</h2>
            <ResetPassword id={member.id} />
          </section>

          {!isSelf && (
            <form action={deleteMember} className="card flex items-center justify-between gap-3 p-6">
              <input type="hidden" name="id" value={member.id} />
              <p className="text-sm text-zinc-500">Borrar la cuenta y todo su historial.</p>
              <ConfirmButton message={`¿Borrar definitivamente a ${member.full_name || member.email}?`}>
                <Trash2 className="size-4" /> Borrar
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
