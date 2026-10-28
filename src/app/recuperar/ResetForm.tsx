"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { requestReset } from "./actions";

export function ResetForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState(requestReset, null);
  if (state?.sent) {
    return (
      <div className="space-y-4 text-center">
        <FormMessage success="Si el email está registrado, te llegará un correo con el botón «Crear nueva contraseña» (revisa también spam). El enlace sirve una sola vez y caduca en 1 hora." />
        <Link href="/login" className="btn btn-secondary w-full">Volver al login</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error ?? notice} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Enviando...">Enviar enlace</SubmitButton>
      <Link href="/login" className="block text-center text-sm text-zinc-500 hover:text-zinc-800">Volver al login</Link>
    </form>
  );
}
