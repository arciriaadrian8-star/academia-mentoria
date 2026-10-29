import Link from "next/link";
import {
  Calculator,
  CalendarDays,
  Check,
  Gift,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Pencil,
  PlayCircle,
  Trophy,
  Users,
} from "lucide-react";
import { getSettings, requireActive } from "@/lib/auth";
import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LocalTime } from "@/components/LocalTime";
import { Markdown } from "@/components/Markdown";
import { RankProgress } from "@/components/RankProgress";
import { SubmitButton } from "@/components/SubmitButton";
import { VideoPlayer } from "../classroom/VideoPlayer";
import { markWelcomeSeen } from "./actions";

const SHORTCUTS = [
  { href: "/classroom", label: "Classroom", text: "Tus cursos y lecciones", icon: GraduationCap },
  { href: "/sesiones", label: "Sesiones grupales", text: "Estudia y trabaja con otros alumnos", icon: Users },
  { href: "/calculadoras", label: "Calculadoras", text: "Rentabilidad, precios y anuncios", icon: Calculator },
  { href: "/plataformas", label: "Plataformas", text: "Dropi, Shopify, IA y más", icon: LayoutGrid },
  { href: "/comunidad", label: "Comunidad", text: "Pregunta, comparte y celebra", icon: MessagesSquare },
  { href: "/calendario", label: "Calendario", text: "Clases y sesiones en vivo", icon: CalendarDays },
  { href: "/ranking", label: "Ranking", text: "Puntos, rangos y medallas", icon: Trophy },
  { href: "/herramientas", label: "Herramientas", text: "Google AI Pro, DropKiller, Releasit y más", icon: Gift },
];

export default async function HomePage() {
  const { supabase, user, profile, isAdmin } = await requireActive();

  const [settings, onboardingRes, boardRes, postsRes, claimsRes, benefitsRes, sessionsRes] = await Promise.all([
    getSettings(),
    supabase.from("onboarding").select("video_url, content").eq("id", 1).maybeSingle(),
    supabase.rpc("leaderboard"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    supabase.from("benefit_claims").select("benefit_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("benefits").select("id", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("study_sessions")
      .select("id, title, starts_at, duration_minutes, session_attendees(user_id)")
      .gte("starts_at", new Date(Date.now() - 4 * 3600 * 1000).toISOString())
      .order("starts_at")
      .limit(6),
  ]);

  const board = (boardRes.data ?? []) as LeaderboardRow[];
  const me = board.find((r) => r.id === user.id) ?? null;
  const memberIndex = board.filter((r) => r.role === "member").findIndex((r) => r.id === user.id);
  const onboarding = onboardingRes.data;
  const upcoming = (sessionsRes.data ?? [])
    .filter((s) => new Date(s.starts_at).getTime() + s.duration_minutes * 60000 > Date.now())
    .slice(0, 3);
  const joinedAnySession = (me?.joined ?? 0) > 0 || (sessionsRes.data ?? []).some((s) => s.session_attendees.some((a) => a.user_id === user.id));

  const steps = [
    {
      done: Boolean(profile.welcome_seen_at) || !onboarding?.video_url,
      label: "Mira el vídeo de inducción",
      href: "#induccion",
    },
    { done: Boolean(profile.avatar_url && profile.bio), label: "Completa tu perfil (foto y sobre ti)", href: "/perfil" },
    { done: (postsRes.count ?? 0) > 0, label: "Preséntate en la comunidad", href: "/comunidad" },
    { done: (me?.lessons ?? 0) > 0, label: "Completa tu primera lección", href: "/classroom" },
    ...((benefitsRes.count ?? 0) > 0
      ? [{ done: (claimsRes.count ?? 0) > 0, label: "Reclama tus herramientas", href: "/herramientas" }]
      : []),
    { done: joinedAnySession, label: "Únete a una sesión grupal", href: "/sesiones" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-brand/70 px-6 py-7 text-white sm:px-8">
          <p className="text-sm font-medium text-white/80">{settings.academy_name}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName ? `Hola, ${firstName} 👋` : "¡Bienvenido/a! 👋"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/85">
            {doneCount < steps.length
              ? `Llevas ${doneCount} de ${steps.length} pasos para arrancar. Sigue la lista y empieza fuerte.`
              : "Completaste todos los pasos de inicio. Ahora a ejecutar 💪"}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section id="induccion" className="card scroll-mt-32 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <PlayCircle className="size-5 text-brand" /> Inducción a la mentoría
              </h2>
              {isAdmin && (
                <Link href="/inicio/editar" className="btn btn-secondary btn-sm">
                  <Pencil className="size-3.5" /> Editar inducción
                </Link>
              )}
            </div>
            {onboarding?.video_url ? (
              <VideoPlayer url={onboarding.video_url} />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center rounded-xl bg-zinc-100 p-6 text-center text-sm text-zinc-500">
                <PlayCircle className="mb-2 size-10 text-zinc-300" />
                {isAdmin ? "Aún no has puesto el vídeo de inducción. Pulsa «Editar inducción»." : "Muy pronto verás aquí el vídeo de bienvenida."}
              </div>
            )}
            {onboarding?.video_url && !profile.welcome_seen_at && (
              <form action={markWelcomeSeen} className="mt-4 flex justify-end">
                <SubmitButton pendingText="Guardando...">
                  <Check className="size-4" /> Ya vi el vídeo
                </SubmitButton>
              </form>
            )}
            {onboarding?.content && <Markdown className="mt-6">{onboarding.content}</Markdown>}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">Todo lo que tienes en la academia</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {SHORTCUTS.map(({ href, label, text, icon: Icon }) => (
                <Link key={href} href={href} className="card group p-4 transition hover:shadow-md">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-3 font-semibold">{label}</p>
                  <p className="text-xs text-zinc-500">{text}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32">
          <div className="card p-5">
            <RankProgress points={me?.points ?? 0} position={memberIndex >= 0 ? memberIndex + 1 : null} />
            <Link href="/ranking" className="mt-3 block text-center text-xs font-semibold text-brand hover:underline">
              Ver ranking y medallas
            </Link>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold">Tus primeros pasos</h3>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
            <ul className="mt-3 space-y-1">
              {steps.map((step) => (
                <li key={step.label}>
                  <Link href={step.href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        step.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300",
                      )}
                    >
                      {step.done && <Check className="size-3" />}
                    </span>
                    <span className={cn(step.done && "text-zinc-400 line-through")}>{step.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Próximas sesiones grupales</h3>
              <Link href="/sesiones/nueva" className="text-xs font-semibold text-brand hover:underline">
                + Crear
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay sesiones programadas. ¡Organiza la primera!</p>
            ) : (
              <ul className="space-y-1">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Link href={`/sesiones/${s.id}`} className="block rounded-lg p-2 hover:bg-zinc-50">
                      <p className="truncate text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-zinc-500">
                        <LocalTime date={s.starts_at} /> · {s.session_attendees.length} inscritos
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
