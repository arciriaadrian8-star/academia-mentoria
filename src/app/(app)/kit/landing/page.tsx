import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getSettings, requireKit } from "@/lib/auth";
import { getPointsBalance, LANDING_TOOL_NAME, modeInfo } from "@/lib/landing";
import { timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { LandingForm } from "./LandingForm";

export default async function LandingToolPage() {
  const { supabase, user } = await requireKit();
  const [settings, points] = await Promise.all([getSettings(), getPointsBalance(supabase, user.id)]);
  const { data } = await supabase
    .from("ai_landings")
    .select("id, product, status, created_at, mode, result->>titulo")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const rows = (data ?? []) as { id: string; product: string; status: string; created_at: string; mode: string | null; titulo: string | null }[];

  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title={LANDING_TOOL_NAME}
        description="Sube la foto de tu producto, tu oferta y una descripción. Elige si quieres la landing completa con fotos de IA, una landing rápida, solo los textos o los prompts para hacer tus fotos gratis en Gemini."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <LandingForm userId={user.id} points={points} costs={{ completa: settings.points_landing, text: settings.points_landing_text }} />
        <div className="space-y-3">
          <h2 className="flex items-center justify-between font-semibold">
            Mis landings {rows.length > 0 && <span className="text-xs font-normal text-zinc-500">{rows.length}</span>}
          </h2>
          {rows.length === 0 ? (
            <EmptyState title="Aún no has creado landings">Llena el formulario con tu producto y en 1 o 2 minutos tienes tu landing lista para Shopify.</EmptyState>
          ) : (
            rows.map((r) => (
              <Link key={r.id} href={`/kit/landing/${r.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
                {r.status === "listo" ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                ) : r.status === "error" ? (
                  <XCircle className="size-5 shrink-0 text-red-600" />
                ) : (
                  <Clock className="size-5 shrink-0 animate-pulse text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.status === "listo" && r.titulo ? r.titulo : r.product}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="chip bg-zinc-100 text-zinc-600">{modeInfo(r.mode).title}</span>
                    {timeAgo(r.created_at)}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">{r.status === "procesando" ? "Creando…" : r.status === "error" ? "Error" : "Lista"}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
