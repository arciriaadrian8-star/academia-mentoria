"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { GraduationCap, MailCheck, Rocket } from "lucide-react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { register } from "./actions";

const MEMBER_OPTIONS = [
  { value: "si", title: "Sí, soy miembro", text: "Todo incluido: tu mentor aprueba tu cuenta y te da acceso.", icon: GraduationCap },
  { value: "no", title: "No, solo la plataforma", text: "Creas tu cuenta y activas tu suscripción mensual a MakeDrop IA.", icon: Rocket },
] as const;

export function RegisterForm({ defaultMember }: { defaultMember?: "si" | "no" }) {
  const [state, action] = useActionState(register, null);
  const [member, setMember] = useState<"si" | "no" | undefined>(defaultMember);

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
      <fieldset>
        <legend className="label">¿Eres miembro de la Academia?</legend>
        <div className="grid grid-cols-2 gap-2">
          {MEMBER_OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = member === o.value;
            return (
              <label
                key={o.value}
                className={`flex cursor-pointer flex-col rounded-xl border p-3 text-left transition ${
                  active ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <input
                  type="radio"
                  name="academy_member"
                  value={o.value}
                  required
                  checked={active}
                  onChange={() => setMember(o.value)}
                  className="sr-only"
                />
                <Icon className={`size-5 ${active ? "text-brand" : "text-zinc-400"}`} />
                <span className="mt-1 text-sm font-semibold text-zinc-900">{o.title}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-zinc-500">{o.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
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
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repite la contraseña</label>
        <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <SubmitButton className="w-full" pendingText="Creando cuenta...">Crear cuenta</SubmitButton>
    </form>
  );
}
