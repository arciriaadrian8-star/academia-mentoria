import Link from "next/link";
import { Clock, Plus, Users } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { SESSION_TOPICS } from "@/lib/constants";
import type { Author, StudySession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { LocalTime } from "@/components/LocalTime";
import { EmptyState, PageHeader } from "@/components/PageHeader";

interface Row extends StudySession {
  host: Author | null;
  session_attendees: { user_id: string }[];
}

const topicLabel = (id: string) => SESSION_TOPICS.find((t) => t.id === id)?.label ?? id;

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  const { supabase, user } = await requireActive();

  let query = supabase
    .from("study_sessions")
    .select("*, host:profiles!study_sessions_host_id_fkey(id, full_name, avatar_url, role), session_attendees(user_id)")
    .gte("starts_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    .order("starts_at");
  if (tema) query = query.eq("topic", tema);
  const { data, error } = await query;
  if (error) throw error;

  const now = Date.now();
  const rows = (data ?? []) as unknown as Row[];
  const endOf = (s: Row) => new Date(s.starts_at).getTime() + s.duration_minutes * 60000;
  const upcoming = rows.filter((s) => endOf(s) > now);
  const past = rows.filter((s) => endOf(s) <= now).reverse().slice(0, 9);

  return (
    <>
      <PageHeader
        title="Sesiones grupales"
        description="Organiza o únete a sesiones por Google Meet con otros alumnos: revisar tiendas, buscar productos, coworking..."
      >
        <Link href="/sesiones/nueva" className="btn btn-primary">
          <Plus className="size-4" /> Organizar sesión
        </Link>
      </PageHeader>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "", label: "Todas" }, ...SESSION_TOPICS].map((t) => (
          <Link
            key={t.id}
            href={t.id ? `/sesiones?tema=${t.id}` : "/sesiones"}
            className={cn(
              "chip shrink-0 px-3 py-1.5 text-sm",
              (tema ?? "") === t.id ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {upcoming.length === 0 ? (
        <EmptyState icon={<Users className="size-10" />} title="No hay sesiones próximas">
          Organiza la primera: elige un tema, crea el enlace de Meet y los demás alumnos se podrán apuntar.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((s) => (
            <SessionCard key={s.id} session={s} userId={user.id} live={new Date(s.starts_at).getTime() <= now} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-sm font-semibold text-zinc-500">Sesiones recientes</h2>
          <div className="grid gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((s) => (
              <SessionCard key={s.id} session={s} userId={user.id} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SessionCard({ session: s, userId, live }: { session: Row; userId: string; live?: boolean }) {
  const count = s.session_attendees.length + 1;
  const going = s.host_id === userId || s.session_attendees.some((a) => a.user_id === userId);
  const full = s.max_attendees !== null && s.session_attendees.length >= s.max_attendees;
  return (
    <Link href={`/sesiones/${s.id}`} className="card flex flex-col p-5 transition hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="chip bg-zinc-100 text-zinc-700">{topicLabel(s.topic)}</span>
        {live && <span className="chip animate-pulse bg-red-100 text-red-700">● En vivo</span>}
        {going && !live && <span className="chip bg-emerald-100 text-emerald-700">Vas a ir</span>}
        {full && !going && <span className="chip bg-amber-100 text-amber-800">Llena</span>}
      </div>
      <h3 className="mt-3 line-clamp-2 font-bold">{s.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
        <Clock className="size-3.5" /> <LocalTime date={s.starts_at} />
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
          <Avatar name={s.host?.full_name} url={s.host?.avatar_url} size={24} />
          <span className="truncate">{s.host?.full_name || "Alumno"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-600">
          <Users className="size-3.5" /> {count}
          {s.max_attendees ? ` / ${s.max_attendees + 1}` : ""}
        </span>
      </div>
    </Link>
  );
}
