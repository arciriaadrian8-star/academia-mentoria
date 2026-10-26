"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { requestReset } from "./actions";

export function ResetForm() {
  const [state, action] = useActionState(requestReset, null);
  if (state?.sent) {
    return (
      <div className="space-y-4 text-center">
        <FormMessage success="Si el email está registrado, recibirás un enlace para crear una nueva contraseña. Revisa también la carpeta de spam." />
        <Link href="/login" className="btn btn-secondary w-full">Volver al login</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Enviando...">Enviar enlace</SubmitButton>
      <Link href="/login" className="block text-center text-sm text-zinc-500 hover:text-zinc-800">Volver al login</Link>
    </form>
  );
}
