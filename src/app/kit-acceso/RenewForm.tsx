"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { renewKit } from "./actions";

export function RenewForm({ code, compact = false }: { code?: string; compact?: boolean }) {
  const [state, action] = useActionState(renewKit, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage error={state?.error} />
      <div className={compact ? "flex flex-wrap gap-2" : "space-y-3"}>
        <input
          name="code"
          required
          defaultValue={code}
          aria-label="Código de acceso"
          placeholder="KIT-XXXX-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="input min-w-0 flex-1 font-mono uppercase"
        />
        <SubmitButton className={compact ? "" : "w-full"} pendingText="Activando...">Activar código</SubmitButton>
      </div>
    </form>
  );
}
