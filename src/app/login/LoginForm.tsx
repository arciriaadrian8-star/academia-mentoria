"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";
import { login } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error ?? notice} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Contraseña</label>
          <Link href="/recuperar" className="mb-1 text-xs font-medium text-brand hover:underline">
            ¿La olvidaste?
          </Link>
        </div>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Entrando...">Entrar</SubmitButton>
    </form>
  );
}
