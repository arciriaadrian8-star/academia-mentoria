import { requireAdmin } from "@/lib/auth";
import { hasAdminKey } from "@/lib/supabase/admin";
import type { AccessLevel } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { NewMemberForm } from "./NewMemberForm";

export default async function NewMemberPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("access_levels").select("*").order("name");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuevo miembro" description="Crea su cuenta y elige a qué contenido tiene acceso." />
      {hasAdminKey() ? (
        <NewMemberForm levels={(data ?? []) as AccessLevel[]} />
      ) : (
        <div className="card p-6 text-sm text-zinc-600">
          Falta la variable <code>SUPABASE_SECRET_KEY</code> en el servidor. Añádela para poder crear miembros.
        </div>
      )}
    </div>
  );
}
