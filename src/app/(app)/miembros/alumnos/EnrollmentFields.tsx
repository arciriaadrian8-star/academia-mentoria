import { PLATFORMS, PROGRAMS, STUDENT_INTERVALS, type Enrollment, type Program } from "@/lib/students";

/** Campos del alumno (crear y editar). */
export function EnrollmentFields({ e, program }: { e?: Enrollment; program?: Program }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="full_name">Nombre</label>
        <input id="full_name" name="full_name" required maxLength={120} defaultValue={e?.full_name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="whatsapp">WhatsApp</label>
        <input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={e?.whatsapp ?? ""} placeholder="3001234567 o con indicativo" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" maxLength={200} defaultValue={e?.email ?? ""} className="input" />
        <p className="mt-1 text-xs text-zinc-500">Si tiene cuenta en la academia con este correo, se liga sola y al pagar se le activa el acceso.</p>
      </div>

      <div>
        <label className="label" htmlFor="program">Programa</label>
        <select id="program" name="program" defaultValue={e?.program ?? program ?? "membresia"} className="input">
          {Object.entries(PROGRAMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="plan_name">Nombre del plan (opcional)</label>
        <input id="plan_name" name="plan_name" maxLength={80} defaultValue={e?.plan_name ?? ""} placeholder="Ej.: Acompañamiento 3 meses, VIP…" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="platform">Dónde paga</label>
        <select id="platform" name="platform" defaultValue={e?.platform ?? "nequi"} className="input">
          {Object.entries(PLATFORMS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} {v.auto ? "(cobro automático)" : "(cobro manual)"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="billing">¿Cómo se cobra?</label>
        <select id="billing" name="billing" defaultValue={e ? (e.auto_renew ? "auto" : "manual") : "default"} className="input">
          {!e && <option value="default">Según la plataforma (Whop/Skool solo, Nequi/Wompi manual)</option>}
          <option value="auto">Automático: la plataforma le cobra sola</option>
          <option value="manual">Manual: yo le cobro y registro el pago</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="amount">Valor</label>
        <input id="amount" name="amount" inputMode="decimal" defaultValue={e?.amount ?? ""} placeholder="Ej.: 450000 o 49" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="currency">Moneda</label>
          <select id="currency" name="currency" defaultValue={e?.currency ?? "COP"} className="input">
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="interval_days">Paga</label>
          <select id="interval_days" name="interval_days" defaultValue={e ? (e.interval_days ?? 0) : 30} className="input">
            {STUDENT_INTERVALS.map((i) => <option key={i.days} value={i.days}>{i.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="start_date">Empezó el</label>
        <input id="start_date" name="start_date" type="date" defaultValue={e?.start_date} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="paid_until">Pagado hasta (próximo cobro)</label>
        <input id="paid_until" name="paid_until" type="date" defaultValue={e?.paid_until ?? ""} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="end_date">Termina el (opcional)</label>
        <input id="end_date" name="end_date" type="date" defaultValue={e?.end_date ?? ""} className="input" />
        <p className="mt-1 text-xs text-zinc-500">Para acompañamientos con fecha de cierre.</p>
      </div>
      <div>
        <label className="label" htmlFor="sessions_included">Sesiones incluidas (opcional)</label>
        <input id="sessions_included" name="sessions_included" type="number" min={0} defaultValue={e?.sessions_included ?? ""} placeholder="Ej.: 12" className="input" />
      </div>

      {e && (
        <div>
          <label className="label" htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={e.status} className="input">
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notas internas</label>
        <textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={e?.notes ?? ""} placeholder="Objetivos, nicho, acuerdos de pago…" className="input" />
      </div>
    </div>
  );
}
