"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { createFirstAdmin } from "./actions";

export function SetupForm() {
  const [state, action] = useActionState(createFirstAdmin, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <div>
        <label className="label" htmlFor="academy_name">Nombre de tu academia</label>
        <input id="academy_name" name="academy_name" placeholder="Ej: Academia Pro" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="full_name">Tu nombre</label>
        <input id="full_name" name="full_name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Tu email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Creando...">Crear mi cuenta de admin</SubmitButton>
    </form>
  );
}
