"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SubscriptionActions({ subscriptionId, canceled }: { subscriptionId: string; canceled: boolean }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!confirm("¿Cancelar tu membresía? No te cobraremos más y conservas el acceso hasta el final del periodo que ya pagaste.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_subscription", { p_id: subscriptionId });
    setBusy(false);
    if (error) return setError("No se pudo cancelar. Intenta de nuevo.");
    router.refresh();
  }

  async function reactivate() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("nequi-suscripcion", { body: { action: "reactivar" } });
    setBusy(false);
    if (error) return setError("No se pudo reactivar. Intenta de nuevo.");
    router.refresh();
  }

  return (
    <>
      {canceled ? (
        <button type="button" disabled={busy} onClick={reactivate} className="btn btn-secondary">Reactivar renovación</button>
      ) : (
        <button type="button" disabled={busy} onClick={cancel} className="btn btn-ghost text-zinc-500">Cancelar membresía</button>
      )}
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </>
  );
}
