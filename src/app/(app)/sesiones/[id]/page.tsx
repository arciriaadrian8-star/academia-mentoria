import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Pencil, Trash2, Users, Video } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { SESSION_TOPICS } from "@/lib/constants";
import type { Author, StudySession } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormMessage } from "@/components/FormMessage";
import { LocalTime } from "@/components/LocalTime";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteSession, joinSession, leaveSession } from "../actions";

interface Row extends StudySession {
  host: Author | null;
  session_attendees: { user_id: string; profile: Author | null }[];
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, user, isStaff } = await requireActive();
  const { data } = await supabase
    .from("study_sessions")
    .select(
      "*, host:profiles!study_sessions_host_id_fkey(id, full_name, avatar_url, role), session_attendees(user_id, profile:profiles!session_attendees_user_id_fkey(id, full_name, avatar_url, role))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const s = data as unknown as Row;

  const start = new Date(s.starts_at).getTime();
  const end = start + s.duration_minutes * 60000;
  const now = Date.now();
  const isHost = s.host_id === user.id;
  const attending = s.session_attendees.some((a) => a.user_id === user.id);
  const canManage = isHost || isStaff;
  const ended = end <= now;
  const live = start <= now && !ended;
  const full = s.max_attendees !== null && s.session_attendees.length >= s.max_attendees;
  const topic = SESSION_TOPICS.find((t) => t.id === s.topic)?.label ?? s.topic;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/sesiones" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Sesiones
      </Link>

      <article className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-zinc-100 text-zinc-700">{topic}</span>
          {live && <span className="chip animate-pulse bg-red-100 text-red-700">● En vivo ahora</span>}
          {ended && <span className="chip bg-zinc-100 text-zinc-500">Terminada</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600">
          <Clock className="size-4" /> <LocalTime date={s.starts_at} /> · {s.duration_minutes} min
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
          <Avatar name={s.host?.full_name} url={s.host?.avatar_url} size={36} />
          <div className="text-sm">
            <p className="font-semibold">{s.host?.full_name || "Alumno"}</p>
            <p className="text-xs text-zinc-500">Organiza la sesión</p>
          </div>
        </div>

        {s.description && <p className="mt-5 text-[15px] whitespace-pre-line text-zinc-700">{s.description}</p>}

        {error === "llena" && (
          <div className="mt-5">
            <FormMessage error="No te pudiste unir: la sesión está llena o ya terminó." />
          </div>
        )}

        {!ended && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-5">
            {isHost || attending || isStaff ? (
              <a href={s.meet_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Video className="size-4" /> Entrar a la llamada de Meet
              </a>
            ) : (
              <form action={joinSession}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton pendingText="Apuntándote..." disabled={full}>
                  <Users className="size-4" /> {full ? "Sesión llena" : "Unirme a la sesión"}
                </SubmitButton>
              </form>
            )}
            {attending && !isHost && (
              <form action={leaveSession}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton className="btn-secondary">Ya no puedo ir</SubmitButton>
              </form>
            )}
            {!isHost && !attending && !isStaff && (
              <p className="text-xs text-zinc-500">Al unirte verás el enlace de la llamada.</p>
            )}
          </div>
        )}

        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/sesiones/${s.id}/editar`} className="btn btn-secondary btn-sm">
              <Pencil className="size-3.5" /> Editar
            </Link>
            <form action={deleteSession}>
              <input type="hidden" name="id" value={s.id} />
              <ConfirmButton message="¿Borrar esta sesión? Los inscritos dejarán de verla." className="btn-sm">
                <Trash2 className="size-3.5" /> Borrar
              </ConfirmButton>
            </form>
          </div>
        )}
      </article>

      <section className="card mt-6 p-6">
        <h2 className="font-semibold">
          Asistentes ({s.session_attendees.length + 1}
          {s.max_attendees ? ` de ${s.max_attendees + 1}` : ""})
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="flex items-center gap-3 text-sm">
            <Avatar name={s.host?.full_name} url={s.host?.avatar_url} size={32} />
            <span className="font-medium">{s.host?.full_name || "Alumno"}</span>
            <span className="chip bg-brand/10 text-brand">Anfitrión</span>
          </li>
          {s.session_attendees.map((a) => (
            <li key={a.user_id} className="flex items-center gap-3 text-sm">
              <Avatar name={a.profile?.full_name} url={a.profile?.avatar_url} size={32} />
              <span className="font-medium">{a.profile?.full_name || "Alumno"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
