import Link from "next/link";
import { CheckCircle2, ExternalLink, Gift, Pencil, Plus } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { Benefit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { Markdown } from "@/components/Markdown";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { claimBenefit } from "./actions";

export default async function BenefitsPage({ searchParams }: { searchParams: Promise<{ error?: string; reclamado?: string }> }) {
  const { error, reclamado } = await searchParams;
  const { supabase, user, isAdmin } = await requireActive();

  const [benefitsRes, claimsRes, codesRes] = await Promise.all([
    supabase.from("benefits").select("*").order("position").order("created_at"),
    supabase.from("benefit_claims").select("benefit_id, claimed_at").eq("user_id", user.id),
    supabase.from("benefit_codes").select("benefit_id, code").eq("assigned_to", user.id),
  ]);
  const benefits = ((benefitsRes.data ?? []) as Benefit[]).filter((b) => b.active || isAdmin);
  const claimed = new Map((claimsRes.data ?? []).map((c) => [c.benefit_id as string, c.claimed_at as string]));
  const myCodes = new Map((codesRes.data ?? []).map((c) => [c.benefit_id as string, c.code as string]));

  return (
    <>
      <PageHeader title="Herramientas" description="Accesos y herramientas incluidas en tu mentoría. Reclámalos aquí.">
        {isAdmin && (
          <Link href="/herramientas/nuevo" className="btn btn-primary">
            <Plus className="size-4" /> Nueva herramienta
          </Link>
        )}
      </PageHeader>

      {error && (
        <div className="mb-4">
          <FormMessage error={error} />
        </div>
      )}

      {benefits.length === 0 ? (
        <EmptyState icon={<Gift className="size-10" />} title="Aún no hay herramientas">
          {isAdmin ? "Crea el primero, por ejemplo tu acceso a Google AI Pro." : "Muy pronto verás aquí tus herramientas."}
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {benefits.map((b) => {
            const isClaimed = claimed.has(b.id);
            const code = myCodes.get(b.id);
            return (
              <article id={`b-${b.id}`} key={b.id} className={cn("card flex scroll-mt-32 flex-col overflow-hidden", reclamado === b.id && "ring-2 ring-emerald-300")}>
                {b.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt="" className="aspect-[2/1] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/1] items-center justify-center bg-gradient-to-br from-brand to-brand/60 text-white">
                    <Gift className="size-10" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-2">
                    <h2 className="flex-1 text-lg font-bold">{b.title}</h2>
                    {!b.active && <span className="chip bg-amber-100 text-amber-800">Oculto</span>}
                    {isAdmin && (
                      <Link href={`/herramientas/${b.id}/editar`} className="btn btn-ghost btn-sm px-1.5" title="Gestionar">
                        <Pencil className="size-4" />
                      </Link>
                    )}
                  </div>
                  <Markdown className="mt-2 text-sm">{b.description}</Markdown>

                  <div className="mt-auto space-y-3 pt-5">
                    {isClaimed ? (
                      <>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 className="size-4" /> Ya lo reclamaste
                        </p>
                        {code && (
                          <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-3">
                            <span className="text-xs text-zinc-500">Tu código:</span>
                            <code className="min-w-0 flex-1 truncate font-mono text-sm font-bold">{code}</code>
                            <CopyButton text={code} />
                          </div>
                        )}
                        {b.claim_url && (
                          <a href={b.claim_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
                            {b.claim_label || "Activar mi beneficio"} <ExternalLink className="size-4" />
                          </a>
                        )}
                      </>
                    ) : (
                      <form action={claimBenefit}>
                        <input type="hidden" name="id" value={b.id} />
                        <SubmitButton className="w-full" pendingText="Reclamando..." disabled={!b.active}>
                          <Gift className="size-4" /> Reclamar
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
