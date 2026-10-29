import Link from "next/link";
import { BadgeCheck, Trash2, Trophy } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { moneyFormatter } from "@/lib/kit";
import type { Author } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteResult, toggleVerified } from "./actions";
import { ResultForm } from "./ResultForm";

interface Result {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  amount: number | null;
  currency: string | null;
  verified: boolean;
  created_at: string;
  profile: Author | null;
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const { supabase, user, isStaff } = await requireActive();
  let query = supabase
    .from("results")
    .select("*, profile:profiles!results_user_id_fkey(id, full_name, avatar_url, role)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (ver === "verificados") query = query.eq("verified", true);
  const { data } = await query;
  const results = (data ?? []) as unknown as Result[];

  return (
    <>
      <PageHeader title="Muro de resultados" description="Resultados reales de alumnos de Adriang Society. El sello verde significa que el equipo lo verificó." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-32">
          <ResultForm userId={user.id} />
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Link href="/resultados" className={cn("chip px-3 py-1.5 text-sm", ver !== "verificados" ? "bg-zinc-900 text-white" : "bg-white ring-1 ring-zinc-200")}>Todos</Link>
            <Link href="/resultados?ver=verificados" className={cn("chip px-3 py-1.5 text-sm", ver === "verificados" ? "bg-zinc-900 text-white" : "bg-white ring-1 ring-zinc-200")}>
              Verificados
            </Link>
          </div>
          {results.length === 0 ? (
            <EmptyState icon={<Trophy className="size-10" />} title="Aún no hay resultados">Sé el primero en compartir tu primera venta. 🚀</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r) => (
                <article key={r.id} className="card flex flex-col overflow-hidden">
                  {r.image_url && (
                    <a href={r.image_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.image_url} alt="" className="aspect-[4/3] w-full bg-zinc-100 object-cover" />
                    </a>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar name={r.profile?.full_name} url={r.profile?.avatar_url} size={24} />
                      <span className="truncate font-medium">{r.profile?.full_name || "Alumno"}</span>
                      <span className="text-xs text-zinc-400">{timeAgo(r.created_at)}</span>
                      {r.verified && <BadgeCheck className="ml-auto size-5 shrink-0 text-emerald-600" aria-label="Verificado" />}
                    </div>
                    <h3 className="mt-2 font-bold">{r.title}</h3>
                    {r.amount !== null && r.currency && <p className="text-lg font-bold text-emerald-700">{moneyFormatter(r.currency)(Number(r.amount))}</p>}
                    {r.body && <p className="mt-1 text-sm whitespace-pre-line text-zinc-600">{r.body}</p>}
                    {(isStaff || r.user_id === user.id) && (
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        {isStaff && (
                          <form action={toggleVerified}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="verified" value={r.verified ? "0" : "1"} />
                            <SubmitButton className={cn("btn-sm", r.verified ? "btn-secondary" : "")}>
                              <BadgeCheck className="size-3.5" /> {r.verified ? "Quitar verificación" : "Verificar"}
                            </SubmitButton>
                          </form>
                        )}
                        <form action={deleteResult}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmButton message="¿Borrar este resultado?" className="btn-ghost btn-sm px-1.5">
                            <Trash2 className="size-3.5" />
                          </ConfirmButton>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
