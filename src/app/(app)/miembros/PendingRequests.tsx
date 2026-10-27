import { Check, UserPlus, X } from "lucide-react";
import type { AccessLevel, Profile } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LevelPicker } from "@/components/LevelPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { approveMember, rejectMember } from "./actions";

export function PendingRequests({ requests, levels }: { requests: Profile[]; levels: AccessLevel[] }) {
  if (requests.length === 0) return null;
  return (
    <section className="card mb-6 overflow-hidden border-amber-200">
      <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
        <UserPlus className="size-4 text-amber-700" />
        <h2 className="text-sm font-semibold text-amber-900">
          Solicitudes de acceso ({requests.length})
        </h2>
      </div>
      <ul className="divide-y divide-zinc-100">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-3 lg:w-72">
              <Avatar name={r.full_name || r.email} url={r.avatar_url} size={40} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.full_name || "Sin nombre"}</p>
                <p className="truncate text-xs text-zinc-500">
                  {r.email} · {timeAgo(r.created_at)}
                </p>
              </div>
            </div>
            <form action={approveMember} className="flex flex-1 flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={r.id} />
              <div className="flex-1">
                <LevelPicker levels={levels} selected={[]} />
              </div>
              <SubmitButton className="btn-sm" pendingText="Aprobando...">
                <Check className="size-4" /> Dar acceso
              </SubmitButton>
            </form>
            <form action={rejectMember}>
              <input type="hidden" name="id" value={r.id} />
              <ConfirmButton message={`¿Rechazar la solicitud de ${r.full_name || r.email}? Se borrará su cuenta.`} className="btn-sm">
                <X className="size-4" /> Rechazar
              </ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
