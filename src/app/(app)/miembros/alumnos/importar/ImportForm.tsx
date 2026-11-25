"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { importStudents, type ImportResult } from "../actions";

const EXAMPLE = `Nombre, Correo, WhatsApp, Programa, Plataforma, Valor, Moneda, Pagado hasta
Laura Gómez, laura@gmail.com, 3001234567, Acompañamiento, Nequi, 450000, COP, 05/12/2026
Carlos Ruiz, carlos@gmail.com, 3109876543, Membresía, Whop, 49, USD, 2026-12-01
Ana Torres, ana@gmail.com, 3205556677, Membresía, Skool, 37, USD, 28/11/2026
Pedro Díaz, pedro@gmail.com, 3157778899, Acompañamiento, Wompi, 300000, COP, 10/12/2026`;

export function ImportForm() {
  const [state, action] = useActionState<ImportResult | null, FormData>(importStudents, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      {state?.error && <FormMessage error={state.error} />}
      {state?.added !== undefined && (
        <FormMessage
          success={`✅ ${state.added} alumnos agregados${state.linked ? ` (${state.linked} ligados a su cuenta de la academia)` : ""}.`}
        />
      )}
      {state?.skipped && state.skipped.length > 0 && (
        <ul className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {state.skipped.map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}
      {state?.added !== undefined && (
        <Link href="/miembros/alumnos" className="btn btn-secondary btn-sm">Ver el control de alumnos</Link>
      )}
      <div>
        <label className="label" htmlFor="default_program">Si la línea no dice el programa, ponerlo en</label>
        <select id="default_program" name="default_program" className="input w-auto">
          <option value="membresia">Membresía</option>
          <option value="acompanamiento">Acompañamiento</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rows">Pega tus alumnos (uno por línea)</label>
        <textarea id="rows" name="rows" rows={12} className="input font-mono text-xs" placeholder={EXAMPLE} />
        <p className="mt-1 text-xs text-zinc-500">
          Orden: <b>nombre, correo, WhatsApp, programa, plataforma, valor, moneda, pagado hasta</b>. Puedes copiar las columnas
          directo desde Excel o Google Sheets. Solo el nombre es obligatorio. Whop y Skool quedan como cobro automático
          (en dólares si no pones moneda); Nequi y Wompi como cobro manual. Todos quedan con pago mensual: cámbialo en la
          ficha si alguno es trimestral o de pago único.
        </p>
      </div>
      <SubmitButton pendingText="Importando...">Importar alumnos</SubmitButton>
    </form>
  );
}
