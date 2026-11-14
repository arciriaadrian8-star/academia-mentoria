"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { activateKit } from "./actions";

export function ActivateForm({ code }: { code?: string }) {
  const [state, action] = useActionState(activateKit, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <div>
        <label className="label" htmlFor="code">Código de acceso</label>
        <input
          id="code"
          name="code"
          required
          defaultValue={code}
          placeholder="KIT-XXXX-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="input font-mono uppercase"
        />
      </div>
      <div>
        <label className="label" htmlFor="full_name">Nombre completo</label>
        <input id="full_name" name="full_name" required autoComplete="name" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
        <p className="mt-1 text-xs text-zinc-500">Mínimo 8 caracteres. ¿Ya tienes cuenta? Usa tu mismo email y contraseña y el código renueva tu acceso.</p>
      </div>
      <SubmitButton className="w-full" pendingText="Activando...">Activar mi acceso</SubmitButton>
    </form>
  );
}
