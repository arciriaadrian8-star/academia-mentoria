import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { badgesFor } from "@/lib/badges";
import { POINTS, rankFor } from "@/lib/constants";
import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { RankProgress } from "@/components/RankProgress";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo } = await searchParams;
  const monthly = periodo === "mes";
  const { supabase, user } = await requireActive();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [periodRes, totalRes] = await Promise.all([
    monthly ? supabase.rpc("leaderboard", { since: monthStart }) : Promise.resolve(null),
    supabase.rpc("leaderboard"),
  ]);
  const total = (totalRes.data ?? []) as LeaderboardRow[];
  // El ranking es para los alumnos: el equipo (admin/coach) no compite.
  const rows = ((monthly ? periodRes?.data : totalRes.data) ?? []) as LeaderboardRow[];
  const board = rows.filter((r) => r.role === "member");
  const meTotal = total.find((r) => r.id === user.id) ?? null;
  const myPos = board.findIndex((r) => r.id === user.id);
  const badges = badgesFor(meTotal);
  const podium = board.slice(0, 3);

  return (
    <>
      <PageHeader title="Ranking" description="Gana puntos aprendiendo, participando y ayudando a otros alumnos.">
        <div className="flex rounded-xl bg-zinc-100 p-1 text-sm">
          {[
            { id: "", label: "Histórico" },
            { id: "mes", label: "Este mes" },
          ].map((p) => (
            <Link
              key={p.id}
              href={p.id ? `/ranking?periodo=${p.id}` : "/ranking"}
              className={cn("rounded-lg px-3 py-1.5 font-medium", (periodo ?? "") === p.id ? "bg-white shadow-sm" : "text-zinc-500")}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {board.length === 0 || board[0].points === 0 ? (
            <EmptyState icon={<Trophy className="size-10" />} title="Todavía nadie suma puntos">
              Completa lecciones, publica en la comunidad y únete a sesiones para aparecer aquí.
            </EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-3 items-end gap-3">
                {[1, 0, 2].map((i) => {
                  const r = podium[i];
                  if (!r) return <div key={i} />;
                  const medal = ["🥇", "🥈", "🥉"][i];
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "card flex flex-col items-center p-4 text-center",
                        i === 0 && "pb-7 ring-2 ring-amber-300",
                        r.id === user.id && "bg-brand/5",
                      )}
                    >
                      <span className="text-2xl">{medal}</span>
                      <Avatar name={r.full_name} url={r.avatar_url} size={i === 0 ? 64 : 48} className="mt-2" />
                      <p className="mt-2 w-full truncate text-sm font-semibold">{r.full_name || "Alumno"}</p>
                      <p className="text-xs text-zinc-500">
                        {rankFor(r.points).emoji} {r.points.toLocaleString("es")} pts
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="card divide-y divide-zinc-100">
                {board.slice(0, 50).map((r, index) => (
                  <div key={r.id} className={cn("flex items-center gap-3 px-4 py-3", r.id === user.id && "bg-brand/5")}>
                    <span className="w-7 text-center text-sm font-bold text-zinc-400">{index + 1}</span>
                    <Avatar name={r.full_name} url={r.avatar_url} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.full_name || "Alumno"} {r.id === user.id && <span className="text-xs font-normal text-brand">(tú)</span>}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {rankFor(r.points).emoji} {rankFor(r.points).name} · {r.lessons} lecciones · {r.joined + r.hosted} sesiones
                      </p>
                    </div>
                    <span className="text-sm font-bold text-brand tabular-nums">{r.points.toLocaleString("es")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32">
          <div className="card p-5">
            <RankProgress points={meTotal?.points ?? 0} position={!monthly && myPos >= 0 ? myPos + 1 : null} />
            {monthly && (
              <p className="mt-3 rounded-lg bg-zinc-50 p-2 text-center text-xs text-zinc-600">
                Este mes: <strong>{(board[myPos]?.points ?? 0).toLocaleString("es")} pts</strong>
                {myPos >= 0 && board[myPos]?.points ? ` · puesto #${myPos + 1}` : ""}
              </p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold">
              Tus medallas ({badges.filter((b) => b.earned).length}/{badges.length})
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  title={b.description}
                  className={cn("flex flex-col items-center rounded-xl p-2 text-center", b.earned ? "bg-amber-50" : "opacity-40 grayscale")}
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="mt-1 text-[11px] leading-tight font-medium">{b.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Pasa el cursor sobre una medalla para ver cómo ganarla.</p>
          </div>

          <div className="card p-5 text-sm">
            <h3 className="font-semibold">¿Cómo se ganan puntos?</h3>
            <ul className="mt-2 space-y-1.5 text-zinc-600">
              <li className="flex justify-between"><span>Completar una lección</span><strong>+{POINTS.lesson}</strong></li>
              <li className="flex justify-between"><span>Organizar una sesión (con asistentes)</span><strong>+{POINTS.hosted}</strong></li>
              <li className="flex justify-between"><span>Asistir a una sesión</span><strong>+{POINTS.joined}</strong></li>
              <li className="flex justify-between"><span>Publicar en la comunidad</span><strong>+{POINTS.post}</strong></li>
              <li className="flex justify-between"><span>Comentar</span><strong>+{POINTS.comment}</strong></li>
              <li className="flex justify-between"><span>Recibir un like</span><strong>+{POINTS.like}</strong></li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
