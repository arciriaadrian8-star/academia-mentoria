import Link from "next/link";
import { ExternalLink, LayoutGrid, Pencil, PlayCircle, Plus, Sparkles } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PLATFORM_CATEGORIES } from "@/lib/constants";
import type { Platform } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/PageHeader";

export default async function PlatformsPage() {
  const { supabase, isStaff } = await requireActive();
  const { data } = await supabase.from("platforms").select("*").order("position").order("name");
  const platforms = (data ?? []) as Platform[];

  const groups = PLATFORM_CATEGORIES.map((c) => ({ ...c, items: platforms.filter((p) => p.category === c.id) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader title="Plataformas" description="Todas las herramientas que usamos en la mentoría, con su acceso y tutorial.">
        {isStaff && (
          <Link href="/plataformas/nueva" className="btn btn-primary">
            <Plus className="size-4" /> Añadir plataforma
          </Link>
        )}
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="size-10" />} title="Aún no hay plataformas">
          {isStaff ? "Añade Dropi, Shopify, tus herramientas de IA..." : "Pronto verás aquí las herramientas de la mentoría."}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-500">{group.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((p) => (
                  <article key={p.id} className="card flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      {p.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.logo_url} alt="" className="size-11 shrink-0 rounded-xl border border-zinc-100 object-cover" />
                      ) : (
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-lg font-bold text-brand">
                          {p.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">{p.name}</h3>
                        {p.description && <p className="mt-0.5 text-sm text-zinc-500">{p.description}</p>}
                      </div>
                      {isStaff && (
                        <Link href={`/plataformas/${p.id}/editar`} className="btn btn-ghost btn-sm shrink-0 px-1.5" title="Editar">
                          <Pencil className="size-4" />
                        </Link>
                      )}
                    </div>
                    {p.perk && (
                      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0" /> {p.perk}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                        Abrir <ExternalLink className="size-3.5" />
                      </a>
                      {p.tutorial_url && (
                        <a href={p.tutorial_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                          <PlayCircle className="size-3.5" /> Ver tutorial
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
