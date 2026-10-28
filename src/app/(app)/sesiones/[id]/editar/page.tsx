import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { StudySession } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { updateSession } from "../../actions";
import { SessionForm } from "../../SessionForm";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isStaff } = await requireActive();
  const { data } = await supabase.from("study_sessions").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const session = data as StudySession;
  if (session.host_id !== user.id && !isStaff) redirect(`/sesiones/${id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/sesiones/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Volver a la sesión
      </Link>
      <PageHeader title="Editar sesión" />
      <SessionForm action={updateSession} session={session} cancelHref={`/sesiones/${id}`} />
    </div>
  );
}
