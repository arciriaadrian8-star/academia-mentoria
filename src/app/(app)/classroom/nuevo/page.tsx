import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { createCourse } from "../actions";

export default async function NewCoursePage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nuevo curso" description="Después podrás añadir portada, módulos, lecciones y elegir quién tiene acceso." />
      <form action={createCourse} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Título del curso</label>
          <input id="title" name="title" required autoFocus className="input" placeholder="Ej: Fundamentos de la mentoría" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={3} className="input" placeholder="¿Qué van a conseguir con este curso?" />
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/classroom" className="btn btn-secondary">Cancelar</Link>
          <SubmitButton pendingText="Creando...">Crear curso</SubmitButton>
        </div>
      </form>
    </div>
  );
}
