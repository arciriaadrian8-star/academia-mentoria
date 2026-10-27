import Link from "next/link";
import { Layers, Plus, Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS } from "@/lib/constants";
import type { AccessLevel, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { LevelChips } from "@/components/LevelChips";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { PendingRequests } from "./PendingRequests";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; nivel?: string }> }) {
  const { q, nivel } = await searchParams;
  const { supabase } = await requireAdmin();

  const [profilesRes, levelsRes, accessRes] = await Promise.all([
    createAdminClient().from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("access_levels").select("*").order("name"),
    supabase.from("member_access").select("user_id, access_level_id"),
  ]);
  const levels = (levelsRes.data ?? []) as AccessLevel[];
  const access = accessRes.data ?? [];
  const levelsOf = (userId: string) =>
    levels.filter((l) => access.some((a) => a.user_id === userId && a.access_level_id === l.id));

  const allProfiles = (profilesRes.data ?? []) as Profile[];
  const requests = allProfiles.filter((m) => m.pending);
  let members = allProfiles.filter((m) => !m.pending);
  if (q) {
    const term = q.toLowerCase();
    members = members.filter((m) => `${m.full_name} ${m.email}`.toLowerCase().includes(term));
  }
  if (nivel) members = members.filter((m) => access.some((a) => a.user_id === m.id && a.access_level_id === nivel));

  return (
    <>
      <PageHeader title="Miembros" description="Da acceso a tus alumnos y decide qué contenido ve cada uno.">
        <Link href="/miembros/niveles" className="btn btn-secondary">
          <Layers className="size-4" /> Niveles de acceso
        </Link>
        <Link href="/miembros/nuevo" className="btn btn-primary">
          <Plus className="size-4" /> Nuevo miembro
        </Link>
      </PageHeader>

      <PendingRequests requests={requests} levels={levels} />

      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-zinc-400" />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o email" className="input pl-9" />
        </div>
        <select name="nivel" defaultValue={nivel ?? ""} className="input w-auto">
          <option value="">Todos los niveles</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      {members.length === 0 ? (
        <EmptyState icon={<Users className="size-10" />} title="No hay miembros que mostrar" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 text-left text-xs font-semibold text-zinc-500">
              <tr>
                <th className="px-4 py-3">Miembro</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Niveles</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/miembros/${m.id}`} className="flex items-center gap-3">
                      <Avatar name={m.full_name || m.email} url={m.avatar_url} size={34} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.full_name || "Sin nombre"}</span>
                        <span className="block truncate text-xs text-zinc-500">{m.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("chip", m.role === "member" ? "bg-zinc-100 text-zinc-700" : "bg-brand/10 text-brand")}>
                      {ROLE_LABELS[m.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <LevelChips levels={levelsOf(m.id)} emptyText={m.role === "member" ? "Sin nivel" : undefined} />
                  </td>
                  <td className="px-4 py-3">
                    {m.active ? (
                      <span className="chip bg-emerald-100 text-emerald-800">Activo</span>
                    ) : (
                      <span className="chip bg-red-100 text-red-700">Sin acceso</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                    {new Date(m.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
