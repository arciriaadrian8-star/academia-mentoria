"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="font-semibold">Cambiar contraseña</h2>
      <FormMessage error={state?.error} success={state?.ok ? "Contraseña actualizada." : null} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">Nueva contraseña</label>
          <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Repítela</label>
          <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando...">Cambiar contraseña</SubmitButton>
      </div>
    </form>
  );
}
