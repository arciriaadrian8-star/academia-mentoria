"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { resetMemberPassword } from "../actions";
import { CredentialsCard } from "../CredentialsCard";

export function ResetPassword({ id }: { id: string }) {
  const [state, action] = useActionState(resetMemberPassword, null);
  return (
    <div className="space-y-3">
      {state?.password ? (
        <CredentialsCard creds={state} title="Nueva contraseña generada" />
      ) : (
        <form action={action} className="flex items-center justify-between gap-3">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-zinc-500">Genera una contraseña nueva si la ha olvidado.</p>
          <SubmitButton className="btn-secondary shrink-0" pendingText="Generando...">
            <KeyRound className="size-4" /> Nueva contraseña
          </SubmitButton>
        </form>
      )}
      <FormMessage error={state?.error} />
    </div>
  );
}
