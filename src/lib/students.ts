/** Control de alumnos: acompañamiento y membresías pagadas por Nequi, Wompi, Whop o Skool. */

export type Program = "acompanamiento" | "membresia";
export type Platform = "nequi" | "wompi" | "whop" | "skool" | "otro";
export type Currency = "COP" | "USD";
export type EnrollmentStatus = "activo" | "pausado" | "cancelado" | "finalizado";

export interface Enrollment {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  program: Program;
  plan_name: string | null;
  platform: Platform;
  auto_renew: boolean;
  amount: number;
  currency: Currency;
  interval_days: number | null;
  start_date: string;
  paid_until: string | null;
  end_date: string | null;
  sessions_included: number | null;
  status: EnrollmentStatus;
  notes: string | null;
  last_reminder_at: string | null;
  created_at: string;
}

export interface StudentPayment {
  id: string;
  enrollment_id: string;
  paid_at: string;
  amount: number;
  currency: Currency;
  platform: Platform;
  reference: string | null;
  note: string | null;
  covers_until: string | null;
  created_at: string;
}

export interface Followup {
  id: string;
  enrollment_id: string;
  kind: "sesion" | "nota" | "recordatorio";
  happened_at: string;
  note: string;
  created_at: string;
}

export interface BillingConfig {
  nequi_number: string | null;
  wompi_link: string | null;
  reminder_days: number;
  template_manual: string | null;
  template_overdue: string | null;
  template_auto_failed: string | null;
  /** Cuántos días antes de la fecha de pago sale el recordatorio automático (por defecto 1). */
  days_before: number;
  /** Enviar los recordatorios automáticos por WhatsApp Business. */
  auto_whatsapp: boolean;
}

export const DEFAULT_CONFIG: BillingConfig = {
  nequi_number: null, wompi_link: null, reminder_days: 3, template_manual: null, template_overdue: null,
  template_auto_failed: null, days_before: 1, auto_whatsapp: true,
};

export interface ReminderLog {
  enrollment_id: string;
  stage: "antes" | "hoy" | "vencido";
  due_date: string;
  status: "enviando" | "enviado" | "fallido" | "sin_whatsapp" | "sin_configurar";
  detail: string | null;
  created_at: string;
}

export const REMINDER_STATUS: Record<ReminderLog["status"], { label: string; className: string }> = {
  enviando: { label: "Enviando…", className: "bg-zinc-100 text-zinc-700" },
  enviado: { label: "✅ WhatsApp enviado", className: "bg-emerald-100 text-emerald-800" },
  fallido: { label: "⚠️ No se pudo enviar", className: "bg-red-100 text-red-700" },
  sin_whatsapp: { label: "Sin WhatsApp en la ficha", className: "bg-amber-100 text-amber-800" },
  sin_configurar: { label: "WhatsApp automático sin configurar", className: "bg-amber-100 text-amber-800" },
};

export const RENEWAL_GOAL = 80;

/**
 * Renovación del mes (aprox.): de los alumnos a los que les tocaba pagar este mes,
 * cuántos pagaron. Pagaron = tienen un pago registrado este mes (sin contar a los que entraron este mes).
 * No pagaron = su fecha de pago cayó este mes, ya pasó y siguen sin pagar, o cancelaron este mes.
 */
export function renewalStats(
  enrollments: (Pick<Enrollment, "id" | "status" | "paid_until" | "start_date" | "interval_days" | "auto_renew"> & { updated_at?: string })[],
  monthPayments: Pick<StudentPayment, "enrollment_id">[],
  today: string,
  filter: (e: Pick<Enrollment, "auto_renew">) => boolean = () => true,
) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const paidIds = new Set(monthPayments.map((p) => p.enrollment_id));
  const pool = enrollments.filter((e) => e.interval_days && filter(e));
  const renewed = pool.filter((e) => paidIds.has(e.id) && e.start_date < monthStart).length;
  const lost = pool.filter((e) => {
    if (paidIds.has(e.id) || !e.paid_until || e.paid_until < monthStart || e.paid_until >= today) return false;
    return e.status === "activo" || e.status === "cancelado" || e.status === "pausado";
  }).length;
  const total = renewed + lost;
  return { renewed, lost, total, rate: total ? Math.round((renewed / total) * 100) : null };
}

export const PROGRAMS: Record<Program, string> = {
  acompanamiento: "Acompañamiento",
  membresia: "Membresía",
};

export const PLATFORMS: Record<Platform, { label: string; auto: boolean; className: string }> = {
  nequi: { label: "Nequi", auto: false, className: "bg-fuchsia-100 text-fuchsia-800" },
  wompi: { label: "Wompi", auto: false, className: "bg-sky-100 text-sky-800" },
  whop: { label: "Whop", auto: true, className: "bg-orange-100 text-orange-800" },
  skool: { label: "Skool", auto: true, className: "bg-yellow-100 text-yellow-800" },
  otro: { label: "Otro", auto: false, className: "bg-zinc-100 text-zinc-700" },
};

export const ENROLLMENT_STATUS: Record<EnrollmentStatus, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-emerald-100 text-emerald-800" },
  pausado: { label: "Pausado", className: "bg-amber-100 text-amber-800" },
  cancelado: { label: "Cancelado", className: "bg-zinc-100 text-zinc-700" },
  finalizado: { label: "Finalizado", className: "bg-zinc-100 text-zinc-700" },
};

export const STUDENT_INTERVALS = [
  { days: 30, label: "Mensual" },
  { days: 90, label: "Trimestral" },
  { days: 180, label: "Semestral" },
  { days: 365, label: "Anual" },
  { days: 0, label: "Pago único" },
] as const;

export const studentIntervalLabel = (days: number | null) =>
  !days ? "pago único" : (STUDENT_INTERVALS.find((i) => i.days === days)?.label.toLowerCase() ?? `cada ${days} días`);

export const DEFAULT_TEMPLATES = {
  manual:
    "Hola {nombre} 👋 Te recuerdo que tu {programa} se renueva el {fecha}. El valor es {monto}.\n\nPuedes pagar por Nequi al {nequi} o con este enlace de Wompi: {wompi}\n\nCuando pagues, envíame el comprobante por aquí y te lo dejo al día 🙌",
  overdue:
    "Hola {nombre} 👋 Tu {programa} venció el {fecha} y aún no veo tu pago de {monto}.\n\nPuedes pagar por Nequi al {nequi} o con este enlace de Wompi: {wompi}\n\nEnvíame el comprobante para no pausar tu acceso. ¡Gracias! 🙏",
  auto_failed:
    "Hola {nombre} 👋 Me aparece que el cobro automático de tu {programa} en {plataforma} no pasó (vencía el {fecha}).\n\nRevisa tu tarjeta en {plataforma} para no perder el acceso. Si necesitas ayuda, escríbeme por aquí 🙌",
};

// ------------------------------------------------------------------ fechas
const TZ = "America/Bogota";

/** Fecha de hoy (YYYY-MM-DD) en hora de Colombia. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const toUtc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Días entre dos fechas YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string) {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function addDays(iso: string, days: number) {
  return new Date(toUtc(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Suma meses respetando el día (30 → mes calendario, 90 → 3 meses…). Si no son meses exactos, suma días. */
export function addInterval(iso: string, days: number) {
  if (days % 30 !== 0 && days !== 365) return addDays(iso, days);
  const months = days === 365 ? 12 : days / 30;
  const y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7) - 1 + months;
  const d = +iso.slice(8, 10);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

/** «25 nov 2026» */
export function formatDay(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Lee una fecha escrita como 2026-11-25, 25/11/2026 o 25-11-2026. */
export function parseDate(raw: string) {
  const v = raw.trim();
  let y: number, m: number, d: number;
  let match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [y, m, d] = [+match[1], +match[2], +match[3]];
  else if ((match = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [d, m, y] = [+match[1], +match[2], +match[3]];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ dinero
export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(amount);
}

/** Lee «150.000», «$150,000», «49.99», «49,99 USD»… */
export function parseAmount(raw: string, currency: Currency) {
  let v = raw.replace(/[^\d.,]/g, "");
  if (!v) return NaN;
  if (currency === "COP") return parseInt(v.replace(/[.,]/g, ""), 10);
  // USD: el último separador seguido de 1-2 dígitos es el decimal.
  const dec = v.match(/[.,](\d{1,2})$/);
  if (dec) v = v.slice(0, -dec[0].length).replace(/[.,]/g, "") + "." + dec[1];
  else v = v.replace(/[.,]/g, "");
  return Math.round(parseFloat(v) * 100) / 100;
}

// ------------------------------------------------------------- estado pago
export type PayState = "al_dia" | "por_vencer" | "vencido" | "sin_fecha" | "pago_unico" | "inactivo";

export function payState(e: Pick<Enrollment, "status" | "paid_until" | "interval_days">, today: string, reminderDays: number): PayState {
  if (e.status !== "activo") return "inactivo";
  if (!e.interval_days) return "pago_unico";
  if (!e.paid_until) return "sin_fecha";
  const left = daysBetween(today, e.paid_until);
  if (left < 0) return "vencido";
  if (left <= reminderDays) return "por_vencer";
  return "al_dia";
}

export function payStateLabel(state: PayState, e: Pick<Enrollment, "paid_until" | "auto_renew" | "platform">, today: string) {
  const left = e.paid_until ? daysBetween(today, e.paid_until) : 0;
  const plat = PLATFORMS[e.platform].label;
  switch (state) {
    case "al_dia":
      return { label: e.auto_renew ? `Al día · se cobra solo en ${plat}` : "Al día", className: "bg-emerald-100 text-emerald-800" };
    case "por_vencer":
      return {
        label: left === 0 ? (e.auto_renew ? `Renueva hoy en ${plat}` : "Vence hoy") : `${e.auto_renew ? "Renueva" : "Vence"} en ${left} día${left === 1 ? "" : "s"}`,
        className: e.auto_renew ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800",
      };
    case "vencido":
      return {
        label: e.auto_renew ? `Verificar en ${plat} (hace ${-left} d)` : `Vencido hace ${-left} día${left === -1 ? "" : "s"}`,
        className: "bg-red-100 text-red-700",
      };
    case "sin_fecha":
      return { label: "Sin fecha de pago", className: "bg-zinc-100 text-zinc-700" };
    case "pago_unico":
      return { label: "Pago único", className: "bg-emerald-100 text-emerald-800" };
    default:
      return { label: "Inactivo", className: "bg-zinc-100 text-zinc-600" };
  }
}

/** Hasta qué fecha queda cubierto un pago hecho hoy. Si venía al día (o con poco atraso), mantiene su fecha de corte. */
export function suggestCoversUntil(e: Pick<Enrollment, "paid_until" | "interval_days">, paidAt: string) {
  if (!e.interval_days) return e.paid_until;
  const base = e.paid_until && daysBetween(e.paid_until, paidAt) <= 15 ? e.paid_until : paidAt;
  let next = addInterval(base, e.interval_days);
  // Si debía varios periodos, que al menos quede cubierto desde hoy.
  while (daysBetween(paidAt, next) <= 0) next = addInterval(next, e.interval_days);
  return next;
}

/** Cuánto equivale al mes (para el ingreso recurrente). */
export const monthlyAmount = (e: Pick<Enrollment, "amount" | "interval_days">) =>
  e.interval_days ? (e.amount * 30) / e.interval_days : 0;

// ---------------------------------------------------------------- WhatsApp
/** Número para wa.me: un celular colombiano de 10 dígitos (3xx…) se completa con el 57. */
export function waNumber(raw: string | null | undefined) {
  const n = (raw ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(n)) return `57${n}`;
  return n.length >= 8 ? n : null;
}

export function reminderTemplate(e: Enrollment, state: PayState, cfg: BillingConfig) {
  if (e.auto_renew) return cfg.template_auto_failed || DEFAULT_TEMPLATES.auto_failed;
  if (state === "vencido") return cfg.template_overdue || DEFAULT_TEMPLATES.overdue;
  return cfg.template_manual || DEFAULT_TEMPLATES.manual;
}

export function fillTemplate(template: string, e: Enrollment, cfg: BillingConfig) {
  const first = e.full_name.trim().split(/\s+/)[0] ?? "";
  const values: Record<string, string> = {
    nombre: first,
    programa: e.plan_name || PROGRAMS[e.program].toLowerCase(),
    fecha: formatDay(e.paid_until),
    monto: formatMoney(e.amount, e.currency),
    nequi: cfg.nequi_number || "(tu número de Nequi)",
    wompi: cfg.wompi_link || "(tu enlace de Wompi)",
    plataforma: PLATFORMS[e.platform].label,
  };
  return template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
}

export function whatsappLink(phone: string | null, text: string) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
