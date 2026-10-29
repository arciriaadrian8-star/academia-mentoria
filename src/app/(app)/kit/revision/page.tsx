import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Trash2 } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { Author } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormMessage } from "@/components/FormMessage";
import { Markdown } from "@/components/Markdown";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { answerReview, deleteReview } from "../actions";
import { ReviewForm } from "./ReviewForm";

interface Review {
  id: string;
  user_id: string;
  store_url: string;
  product: string | null;
  ad_url: string | null;
  question: string | null;
  status: "pendiente" | "revisada";
  feedback: string | null;
  created_at: string;
  reviewed_at: string | null;
  profile: Author | null;
  reviewer: Author | null;
}

const CHECKLIST = `**Página de producto**
- [ ] Primera imagen y título dicen qué es y qué resuelve
- [ ] Oferta visible arriba (precio tachado, 2x1, envío gratis, pago al recibir)
- [ ] Reseñas reales, garantía y preguntas frecuentes
- [ ] Carga rápido en el celular

**Formulario (Releasit)**
- [ ] Solo campos necesarios
- [ ] Ofertas por cantidad y upsell

**Anuncio**
- [ ] Gancho en los primeros 3 segundos
- [ ] Ángulo claro y llamado a la acción con la oferta

**Recomendaciones:**
1.
2.
3. `;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ enviada?: string }> }) {
  const { enviada } = await searchParams;
  const { supabase, user, isStaff } = await requireActive();
  const { data } = await supabase
    .from("store_reviews")
    .select(
      "*, profile:profiles!store_reviews_user_id_fkey(id, full_name, avatar_url, role), reviewer:profiles!store_reviews_reviewed_by_fkey(id, full_name, avatar_url, role)",
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  const reviews = (data ?? []) as unknown as Review[];
  const mine = reviews.filter((r) => r.user_id === user.id);
  const queue = isStaff ? reviews.filter((r) => r.user_id !== user.id) : [];

  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader title="Revisión de tienda" description="Envía tu tienda y tu anuncio, y el equipo de Adriang Society te responde con feedback concreto." />

      {enviada && (
        <div className="mb-4">
          <FormMessage success="¡Listo! Tu tienda quedó en la fila de revisión. Te avisaremos aquí mismo." />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <ReviewForm />
        <div className="space-y-4">
          <h2 className="font-semibold">Mis revisiones</h2>
          {mine.length === 0 ? <EmptyState title="Aún no has pedido revisiones" /> : mine.map((r) => <ReviewCard key={r.id} r={r} isStaff={false} own />)}
        </div>
      </div>

      {isStaff && (
        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold">
            Fila de revisión · {queue.filter((r) => r.status === "pendiente").length} pendientes
          </h2>
          {queue.length === 0 ? <p className="card p-5 text-sm text-zinc-500">No hay solicitudes.</p> : queue.map((r) => <ReviewCard key={r.id} r={r} isStaff />)}
        </section>
      )}
    </>
  );
}

function ReviewCard({ r, isStaff, own }: { r: Review; isStaff: boolean; own?: boolean }) {
  return (
    <article id={`r-${r.id}`} className="card scroll-mt-32 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {r.status === "pendiente" ? (
          <span className="chip bg-amber-100 text-amber-800"><Clock className="size-3" /> Pendiente</span>
        ) : (
          <span className="chip bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-3" /> Revisada</span>
        )}
        {!own && (
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Avatar name={r.profile?.full_name} url={r.profile?.avatar_url} size={20} /> {r.profile?.full_name || "Alumno"}
          </span>
        )}
        <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span>
        {(own ? r.status === "pendiente" : isStaff) && (
          <form action={deleteReview} className="ml-auto">
            <input type="hidden" name="id" value={r.id} />
            <ConfirmButton message="¿Borrar esta solicitud?" className="btn-ghost btn-sm px-1.5">
              <Trash2 className="size-3.5" />
            </ConfirmButton>
          </form>
        )}
      </div>
      {r.product && <p className="mt-2 font-semibold">{r.product}</p>}
      <div className="mt-1 flex flex-wrap gap-3 text-sm">
        <a href={r.store_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
          Tienda <ExternalLink className="size-3" />
        </a>
        {r.ad_url && (
          <a href={r.ad_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
            Anuncio <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      {r.question && <p className="mt-2 text-sm whitespace-pre-line text-zinc-700">{r.question}</p>}

      {r.feedback && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4">
          <p className="mb-2 text-xs font-semibold text-emerald-800">Feedback de {r.reviewer?.full_name || "tu mentor"}</p>
          <Markdown className="text-sm">{r.feedback}</Markdown>
        </div>
      )}

      {isStaff && (
        <form action={answerReview} className="mt-4 space-y-2">
          <input type="hidden" name="id" value={r.id} />
          <label className="label" htmlFor={`fb-${r.id}`}>{r.feedback ? "Editar feedback" : "Responder"}</label>
          <textarea id={`fb-${r.id}`} name="feedback" rows={10} defaultValue={r.feedback ?? CHECKLIST} className="input font-mono text-xs" required />
          <div className="flex justify-end">
            <SubmitButton pendingText="Enviando...">{r.feedback ? "Guardar" : "Enviar feedback"}</SubmitButton>
          </div>
        </form>
      )}
    </article>
  );
}
