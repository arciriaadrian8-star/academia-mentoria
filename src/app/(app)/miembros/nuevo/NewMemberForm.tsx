"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import type { AccessLevel, Role } from "@/lib/types";
import { FormMessage } from "@/components/FormMessage";
import { LevelPicker } from "@/components/LevelPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { createMember } from "../actions";
import { CredentialsCard } from "../CredentialsCard";

export function NewMemberForm({ levels }: { levels: AccessLevel[] }) {
  const [formKey, setFormKey] = useState(0);
  return <MemberForm key={formKey} levels={levels} onAnother={() => setFormKey(formKey + 1)} />;
}

function MemberForm({ levels, onAnother }: { levels: AccessLevel[]; onAnother: () => void }) {
  const [state, action] = useActionState(createMember, null);

  if (state?.password) {
    return (
      <div className="card space-y-4 p-6">
        <CredentialsCard creds={state} title={`✅ ${state.name} ya tiene acceso`} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={onAnother}>
            Crear otro miembro
          </button>
          <Link href="/miembros" className="btn btn-secondary">Ver miembros</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5 p-6">
      <FormMessage error={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="full_name">Nombre completo</label>
          <input id="full_name" name="full_name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
      </div>

      <div>
        <span className="label">Rol</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["member", "coach", "admin"] as Role[]).map((role) => (
            <label
              key={role}
              className="cursor-pointer rounded-xl border border-zinc-200 p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="role" value={role} defaultChecked={role === "member"} className="accent-brand" />
                {ROLE_LABELS[role]}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">{ROLE_DESCRIPTIONS[role]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Niveles de acceso</span>
        <LevelPicker levels={levels} selected={[]} emptyHint="Determinan qué cursos y eventos verá. Puedes cambiarlos cuando quieras." />
      </div>

      <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
        Se generará una contraseña temporal que podrás copiar o enviar por WhatsApp. El miembro podrá cambiarla desde su perfil.
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/miembros" className="btn btn-secondary">Cancelar</Link>
        <SubmitButton pendingText="Creando...">Crear acceso</SubmitButton>
      </div>
    </form>
  );
}
