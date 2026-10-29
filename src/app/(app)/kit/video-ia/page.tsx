import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { VideoScriptForm } from "./VideoScriptForm";

export default async function VideoAIPage() {
  const { supabase, user } = await requireActive();
  const { data } = await supabase
    .from("ai_scripts")
    .select("id, product, format, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const rows = data ?? [];

  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title="Guion IA desde un video ganador"
        description="Sube un anuncio que esté vendiendo. La IA lo ve, descubre por qué funciona y te escribe un guion nuevo para tu producto, con los prompts de cada escena para Flow / Veo."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <VideoScriptForm userId={user.id} />
        <div className="space-y-3">
          <h2 className="font-semibold">Mis guiones</h2>
          {rows.length === 0 ? (
            <EmptyState title="Aún no has creado guiones">
              Busca un anuncio ganador en la Biblioteca de anuncios o en DropKiller, descárgalo y súbelo aquí.
            </EmptyState>
          ) : (
            rows.map((r) => (
              <Link key={r.id} href={`/kit/video-ia/${r.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
                {r.status === "listo" ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : r.status === "error" ? (
                  <XCircle className="size-5 text-red-600" />
                ) : (
                  <Clock className="size-5 animate-pulse text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.product}</p>
                  <p className="text-xs text-zinc-500">{timeAgo(r.created_at)}</p>
                </div>
                <span className="text-xs text-zinc-500">{r.status === "procesando" ? "Analizando…" : r.status === "error" ? "Error" : "Listo"}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
