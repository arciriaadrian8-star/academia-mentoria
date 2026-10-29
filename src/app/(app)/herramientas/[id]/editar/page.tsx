import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Benefit } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { deleteBenefit, deleteFreeCodes, updateBenefit } from "../../actions";
import { BenefitForm } from "../../BenefitForm";

interface ClaimRow {
  user_id: string;
  claimed_at: string;
  code: { code: string } | null;
  profile: { full_name: string; avatar_url: string | null } | null;
}

export default async function EditBenefitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [{ id }, { guardado }] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const [benefitRes, totalRes, freeRes, claimsRes] = await Promise.all([
    supabase.from("benefits").select("*").eq("id", id).maybeSingle(),
    supabase.from("benefit_codes").select("id", { count: "exact", head: true }).eq("benefit_id", id),
    supabase.from("benefit_codes").select("id", { count: "exact", head: true }).eq("benefit_id", id).is("assigned_to", null),
    supabase
      .from("benefit_claims")
      .select("user_id, claimed_at, code:benefit_codes(code), profile:profiles!benefit_claims_user_id_fkey(full_name, avatar_url)")
      .eq("benefit_id", id)
      .order("claimed_at", { ascending: false }),
  ]);
  if (!benefitRes.data) notFound();
  const benefit = benefitRes.data as Benefit;
  const claims = (claimsRes.data ?? []) as unknown as ClaimRow[];
  const free = freeRes.count ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/herramientas" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" /> Herramientas
        </Link>
        <PageHeader title={benefit.title}>
          <form action={deleteBenefit}>
            <input type="hidden" name="id" value={benefit.id} />
            <ConfirmButton message="¿Borrar este beneficio, sus códigos y quién lo reclamó?">
              <Trash2 className="size-4" /> Borrar
            </ConfirmButton>
          </form>
        </PageHeader>
      </div>

      {guardado && <FormMessage success="Beneficio guardado." />}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{claims.length}</p>
          <p className="text-xs text-zinc-500">reclamados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{totalRes.count ?? 0}</p>
          <p className="text-xs text-zinc-500">códigos cargados</p>
        </div>
        <div className="card p-4 text-center">
          <p className={`text-2xl font-bold ${benefit.delivery === "code" && free < 5 ? "text-red-600" : ""}`}>{free}</p>
          <p className="text-xs text-zinc-500">códigos libres</p>
        </div>
      </div>
      {benefit.delivery === "code" && free === 0 && (
        <FormMessage error="No quedan códigos libres: los alumnos verán «Se agotaron los códigos» al reclamar. Pega más abajo." />
      )}

      <BenefitForm action={updateBenefit} benefit={benefit} />

      {free > 0 && (
        <form action={deleteFreeCodes} className="flex justify-end">
          <input type="hidden" name="id" value={benefit.id} />
          <ConfirmButton message={`¿Borrar los ${free} códigos que nadie ha usado?`} className="btn-sm">
            Borrar códigos sin usar
          </ConfirmButton>
        </form>
      )}

      <section className="card p-5">
        <h2 className="font-semibold">Quién lo reclamó</h2>
        {claims.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nadie todavía.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {claims.map((c) => (
              <li key={c.user_id} className="flex items-center gap-3 py-2.5 text-sm">
                <Avatar name={c.profile?.full_name} url={c.profile?.avatar_url} size={30} />
                <span className="min-w-0 flex-1 truncate font-medium">{c.profile?.full_name || "Alumno"}</span>
                {c.code && <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">{c.code.code}</code>}
                <span className="text-xs text-zinc-400">{new Date(c.claimed_at).toLocaleDateString("es")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
