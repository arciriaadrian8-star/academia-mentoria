import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ImportForm } from "./ImportForm";

export default async function ImportStudentsPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/miembros/alumnos" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Control de alumnos
      </Link>
      <PageHeader
        title="Importar alumnos"
        description="Sube de una vez a todos tus alumnos de Nequi, Wompi, Whop y Skool. Si el correo coincide con una cuenta de la academia, se ligan solos."
      />
      <ImportForm />
    </div>
  );
}
