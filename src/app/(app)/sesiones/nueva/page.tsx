import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { createSession } from "../actions";
import { SessionForm } from "../SessionForm";

export default async function NewSessionPage() {
  await requireActive();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/sesiones" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Sesiones
      </Link>
      <PageHeader title="Organizar una sesión grupal" description="Invita a otros alumnos a estudiar, revisar tiendas o trabajar juntos por Google Meet." />
      <SessionForm action={createSession} cancelHref="/sesiones" />
    </div>
  );
}
