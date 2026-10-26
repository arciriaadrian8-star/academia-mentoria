import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { LEVEL_COLORS } from "@/lib/constants";
import type { AccessLevel } from "@/lib/types";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { createLevel, deleteLevel, updateLevel } from "../actions";

export default async function LevelsPage() {
  const { supabase } = await requireAdmin();
  const [levelsRes, accessRes, courseAccessRes] = await Promise.all([
    supabase.from("access_levels").select("*").order("name"),
    supabase.from("member_access").select("access_level_id"),
    supabase.from("course_access").select("access_level_id"),
  ]);
  const levels = (levelsRes.data ?? []) as AccessLevel[];
  const count = (rows: { access_level_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.access_level_id === id).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/miembros" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Miembros
      </Link>
      <PageHeader
        title="Niveles de acceso"
        description="Crea niveles como «Básico», «Premium» o «VIP 1:1». Asígnalos a miembros, cursos y eventos para controlar quién ve qué."
      />

      <div className="card mb-6 p-5 text-sm text-zinc-600">
        <p className="font-semibold text-zinc-800">¿Cómo funciona?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Un curso o evento <strong>sin niveles</strong> lo ven todos los miembros.</li>
          <li>Un curso o evento <strong>con niveles</strong> solo lo ven los miembros que tengan alguno de esos niveles.</li>
          <li>Admins y coaches ven siempre todo.</li>
        </ul>
      </div>

      <div className="card divide-y divide-zinc-100">
        {levels.length === 0 && <p className="p-5 text-sm text-zinc-500">Todavía no hay niveles.</p>}
        {levels.map((level) => (
          <div key={level.id} className="flex flex-wrap items-center gap-3 p-4">
            <form action={updateLevel} className="flex min-w-0 flex-1 items-center gap-2">
              <input type="hidden" name="id" value={level.id} />
              <input type="color" name="color" defaultValue={level.color} className="size-9 shrink-0 cursor-pointer rounded-lg border border-zinc-200 p-1" />
              <input name="name" defaultValue={level.name} required className="input" />
              <SubmitButton className="btn-sm btn-secondary shrink-0">Guardar</SubmitButton>
            </form>
            <span className="text-xs whitespace-nowrap text-zinc-500">
              {count(accessRes.data, level.id)} miembros · {count(courseAccessRes.data, level.id)} cursos
            </span>
            <form action={deleteLevel}>
              <input type="hidden" name="id" value={level.id} />
              <ConfirmButton
                message={`¿Borrar el nivel «${level.name}»? Los miembros perderán el acceso a los cursos que dependan de él.`}
                className="btn-sm border-0 px-1.5"
                title="Borrar nivel"
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            </form>
          </div>
        ))}
        <form action={createLevel} className="flex items-center gap-2 bg-zinc-50 p-4">
          <input type="color" name="color" defaultValue={LEVEL_COLORS[levels.length % LEVEL_COLORS.length]} className="size-9 shrink-0 cursor-pointer rounded-lg border border-zinc-200 p-1" />
          <input name="name" required placeholder="Nombre del nuevo nivel (ej: Premium)" className="input" />
          <SubmitButton className="shrink-0">Crear nivel</SubmitButton>
        </form>
      </div>
    </div>
  );
}
