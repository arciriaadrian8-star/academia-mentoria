import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireKit } from "@/lib/auth";
import { LANDING_TOOL_NAME } from "@/lib/landing";
import { timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { LandingForm } from "./LandingForm";

export default async function LandingToolPage() {
  const { supabase, user, isStaff } = await requireKit();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("ai_landings").select("id, product, status, created_at, result->>titulo").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("ai_landings").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since),
  ]);
  const rows = (data ?? []) as { id: string; product: string; status: string; created_at: string; titulo: string | null }[];

  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title={LANDING_TOOL_NAME}
        description="Sube la foto de tu producto, tu oferta y una descripción. La IA te arma la landing completa para Shopify: título ganador, imágenes, descripción y preguntas frecuentes, lista para importar."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <LandingForm userId={user.id} used={isStaff ? null : count ?? 0} />
        <div className="space-y-3">
          <h2 className="font-semibold">Mis landings</h2>
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
                  <p className="text-xs text-zinc-500">{timeAgo(r.created_at)}</p>
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
