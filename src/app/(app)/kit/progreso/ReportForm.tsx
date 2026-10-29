"use client";

import { useActionState } from "react";
import { CURRENCIES } from "@/lib/kit";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { saveReport, type ReportState } from "../actions";

export function ReportForm({ defaultWeek, defaultCurrency }: { defaultWeek: string; defaultCurrency: string }) {
  const [state, action] = useActionState<ReportState, FormData>(saveReport, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">Reporte de la semana</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="week_start">Semana (cualquier día)</label>
          <input id="week_start" name="week_start" type="date" defaultValue={defaultWeek} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="currency">Moneda</label>
          <select id="currency" name="currency" defaultValue={defaultCurrency} className="input">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="orders">Pedidos generados</label>
          <input id="orders" name="orders" type="number" min={0} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="delivered">Pedidos entregados</label>
          <input id="delivered" name="delivered" type="number" min={0} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="revenue">Ventas entregadas (dinero)</label>
          <input id="revenue" name="revenue" type="number" min={0} step="any" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ad_spend">Gasto en publicidad</label>
          <input id="ad_spend" name="ad_spend" type="number" min={0} step="any" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="profit">Utilidad neta de la semana</label>
          <input id="profit" name="profit" type="number" step="any" className="input" />
          <p className="hint">Lo que te quedó después de producto, fletes, devoluciones y publicidad. Puede ser negativa.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">¿Qué aprendiste o en qué necesitas ayuda?</label>
          <textarea id="notes" name="notes" rows={3} maxLength={2000} className="input" />
        </div>
      </div>
      <FormMessage error={state?.error} success={state?.ok ? "¡Reporte guardado! Si ya existía para esa semana, se actualizó." : undefined} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando...">Guardar reporte</SubmitButton>
      </div>
    </form>
  );
}
