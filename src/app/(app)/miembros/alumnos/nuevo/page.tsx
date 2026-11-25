import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Program } from "@/lib/students";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { saveEnrollment } from "../actions";
import { EnrollmentFields } from "../EnrollmentFields";

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ error?: string; programa?: string }> }) {
  const { error, programa } = await searchParams;
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/miembros/alumnos" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Control de alumnos
      </Link>
      <PageHeader title="Agregar alumno" description="Funciona aunque el alumno no tenga cuenta en la academia (por ejemplo, si solo está en Skool o Whop)." />
      <form action={saveEnrollment} className="card space-y-5 p-6">
        {error && <FormMessage error={error} />}
        <EnrollmentFields program={(programa === "acompanamiento" ? "acompanamiento" : "membresia") satisfies Program} />
        <SubmitButton pendingText="Guardando...">Agregar alumno</SubmitButton>
      </form>
    </div>
  );
}
