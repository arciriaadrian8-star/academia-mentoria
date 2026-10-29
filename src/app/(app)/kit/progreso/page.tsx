import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { moneyFormatter, weekStart } from "@/lib/kit";
import type { Author } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { deleteReport } from "../actions";
import { ReportForm } from "./ReportForm";

interface Report {
  id: string;
  user_id: string;
  week_start: string;
  currency: string;
  orders: number;
  delivered: number;
  revenue: number;
  ad_spend: number;
  profit: number;
  notes: string | null;
  profile?: Author | null;
}

const fmtWeek = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });

export default async function ProgressPage() {
  const { supabase, user, isStaff } = await requireActive();
  const thisWeek = weekStart();

  const { data: mine } = await supabase
    .from("progress_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(26);
  const reports = (mine ?? []) as Report[];
  const last = reports[0];
  const chart = [...reports].slice(0, 12).reverse();
  const maxProfit = Math.max(...chart.map((r) => Math.abs(Number(r.profit))), 1);

  let team: Report[] = [];
  let missing: Author[] = [];
  if (isStaff) {
    const since = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
    const [{ data: all }, { data: students }] = await Promise.all([
      supabase
        .from("progress_reports")
        .select("*, profile:profiles!progress_reports_user_id_fkey(id, full_name, avatar_url, role)")
        .gte("week_start", since)
        .order("week_start", { ascending: false }),
      supabase.from("profiles").select("id, full_name, avatar_url, role").eq("active", true).eq("role", "student"),
    ]);
    const latest = new Map<string, Report>();
    for (const r of (all ?? []) as unknown as Report[]) if (!latest.has(r.user_id)) latest.set(r.user_id, r);
    team = [...latest.values()].sort((a, b) => Number(b.profit) - Number(a.profit));
    const reportedThisWeek = new Set(((all ?? []) as unknown as Report[]).filter((r) => r.week_start === thisWeek).map((r) => r.user_id));
    missing = ((students ?? []) as Author[]).filter((s) => !reportedThisWeek.has(s.id));
  }

  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader title="Mi progreso" description="Registra tus números cada semana. Así ves tu evolución y tu mentor sabe en qué ayudarte." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ReportForm defaultWeek={thisWeek} defaultCurrency={last?.currency ?? "COP"} />

        <div className="space-y-4">
          {reports.length === 0 ? (
            <EmptyState title="Aún no tienes reportes">Sube el de esta semana aunque estés empezando: el primer número es el más importante.</EmptyState>
          ) : (
            <>
              <section className="card p-5">
                <h2 className="font-semibold">Utilidad por semana</h2>
                <div className="mt-4 flex h-40 items-stretch gap-1.5">
                  {chart.map((r) => {
                    const v = Number(r.profit);
                    const h = `${(Math.abs(v) / maxProfit) * 100}%`;
                    return (
                      <div key={r.id} className="flex min-w-0 flex-1 flex-col" title={`${fmtWeek(r.week_start)}: ${moneyFormatter(r.currency)(v)}`}>
                        <div className="flex flex-1 items-end border-b border-zinc-200">
                          {v >= 0 && <div className="w-full rounded-t bg-emerald-400" style={{ height: h }} />}
                        </div>
                        <div className="flex flex-1 items-start">{v < 0 && <div className="w-full rounded-b bg-red-400" style={{ height: h }} />}</div>
                        <span className="mt-1 truncate text-center text-[10px] text-zinc-400">{fmtWeek(r.week_start)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="card divide-y divide-zinc-100">
                {reports.map((r) => {
                  const money = moneyFormatter(r.currency);
                  const eff = r.orders > 0 ? r.delivered / r.orders : NaN;
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                      <span className="w-20 font-semibold">{fmtWeek(r.week_start)}</span>
                      <span className="text-zinc-600">{r.orders} pedidos · {r.delivered} entregados</span>
                      <span className={cn("chip", eff >= 0.7 ? "bg-emerald-100 text-emerald-700" : eff >= 0.55 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700")}>
                        {Number.isFinite(eff) ? `${Math.round(eff * 100)}% entrega` : "—"}
                      </span>
                      <span className={cn("ml-auto font-bold tabular-nums", Number(r.profit) >= 0 ? "text-emerald-700" : "text-red-700")}>{money(Number(r.profit))}</span>
                      <form action={deleteReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton message="¿Borrar este reporte?" className="btn-ghost btn-sm px-1.5">
                          <Trash2 className="size-3.5" />
                        </ConfirmButton>
                      </form>
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </div>

      {isStaff && (
        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold">Equipo · último reporte de cada alumno</h2>
          {team.length === 0 ? (
            <p className="card p-5 text-sm text-zinc-500">Nadie ha reportado en las últimas 5 semanas.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                  <tr>
                    <th className="px-4 py-2">Alumno</th>
                    <th className="px-4 py-2">Semana</th>
                    <th className="px-4 py-2">Pedidos</th>
                    <th className="px-4 py-2">Entrega</th>
                    <th className="px-4 py-2">Publicidad</th>
                    <th className="px-4 py-2">Utilidad</th>
                    <th className="px-4 py-2">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {team.map((r) => {
                    const money = moneyFormatter(r.currency);
                    const eff = r.orders > 0 ? Math.round((r.delivered / r.orders) * 100) : null;
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-2">
                          <Link href={`/miembros/${r.user_id}`} className="flex items-center gap-2 font-medium hover:underline">
                            <Avatar name={r.profile?.full_name} url={r.profile?.avatar_url} size={24} /> {r.profile?.full_name || "Alumno"}
                          </Link>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{fmtWeek(r.week_start)}</td>
                        <td className="px-4 py-2">{r.orders}</td>
                        <td className="px-4 py-2">{eff !== null ? `${eff}%` : "—"}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{money(Number(r.ad_spend))}</td>
                        <td className={cn("px-4 py-2 font-semibold whitespace-nowrap", Number(r.profit) >= 0 ? "text-emerald-700" : "text-red-700")}>{money(Number(r.profit))}</td>
                        <td className="max-w-xs truncate px-4 py-2 text-zinc-500" title={r.notes ?? ""}>{r.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {missing.length > 0 && (
            <div className="card p-5">
              <p className="font-semibold">Sin reporte esta semana ({missing.length})</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {missing.map((m) => (
                  <Link key={m.id} href={`/miembros/${m.id}`} className="chip bg-zinc-100 px-2.5 py-1 text-zinc-700 hover:bg-zinc-200">
                    {m.full_name || "Alumno"}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
