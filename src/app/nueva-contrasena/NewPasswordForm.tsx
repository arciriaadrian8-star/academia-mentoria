"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { setNewPassword } from "./actions";

export function NewPasswordForm({ email }: { email: string }) {
  const [state, action] = useActionState(setNewPassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      {/* Para que el navegador guarde la contraseña nueva con tu email */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div>
        <label className="label" htmlFor="password">Nueva contraseña</label>
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repite la contraseña</label>
        <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Guardando...">Guardar contraseña</SubmitButton>
    </form>
  );
}
