"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { register } from "./actions";

export function RegisterForm() {
  const [state, action] = useActionState(register, null);

  if (state?.checkEmail) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-10 text-brand" />
        <p className="text-sm text-zinc-600">
          Te hemos enviado un email a <strong>{state.checkEmail}</strong>. Abre el enlace para confirmar tu cuenta (revisa también
          el spam).
        </p>
        <Link href="/login" className="btn btn-secondary w-full">Ir al login</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <div>
        <label className="label" htmlFor="full_name">Nombre completo</label>
        <input id="full_name" name="full_name" required autoComplete="name" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repite la contraseña</label>
        <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Creando cuenta...">Crear cuenta</SubmitButton>
    </form>
  );
}
