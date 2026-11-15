export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price_cop: number;
  interval_days: number;
  grants_role: "kit" | "member";
  active: boolean;
  position: number;
  skool_url: string | null;
  contact_whatsapp: string | null;
  compare_price_cop: number | null;
}

/** Columnas de subscriptions que pueden leer los usuarios (los tokens quedan solo en el servidor). */
export const SUBSCRIPTION_COLUMNS =
  "id, user_id, plan_id, status, customer_email, phone_last4, payment_method, card_brand, card_last4, current_period_end, next_charge_at, failed_attempts, cancel_at_period_end, last_error, created_at, discount_code, discount_remaining, skool_email";

export type SubscriptionStatus = "pendiente" | "activa" | "en_mora" | "cancelada" | "vencida" | "fallida";

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  phone_last4: string | null;
  payment_method: "NEQUI" | "CARD";
  card_brand: string | null;
  card_last4: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  failed_attempts: number;
  cancel_at_period_end: boolean;
  last_error: string | null;
  created_at: string;
  customer_email: string;
  discount_code: string | null;
  discount_remaining: number;
  skool_email: string | null;
}

export interface DiscountCode {
  code: string;
  description: string | null;
  kind: "percent" | "fixed";
  value: number;
  duration: "first" | "months" | "forever";
  duration_months: number | null;
  plan_id: string | null;
  max_redemptions: number | null;
  redemptions: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

/** «20% de descuento el primer mes», «$10.000 de descuento por 3 meses»… */
export function discountLabel(d: { kind: string; value: number; duration: string; duration_months?: number | null }) {
  const amount = d.kind === "percent" ? `${d.value}%` : formatCop(d.value);
  const when =
    d.duration === "forever" ? "en todos los cobros" : d.duration === "months" ? `por ${d.duration_months} cobros` : "en el primer cobro";
  return `${amount} de descuento ${when}`;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  user_id: string;
  reference: string;
  amount_cop: number;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  status_message: string | null;
  created_at: string;
}

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; className: string }> = {
  pendiente: { label: "Pago en proceso", className: "bg-amber-100 text-amber-800" },
  activa: { label: "Activa", className: "bg-emerald-100 text-emerald-800" },
  en_mora: { label: "Pago pendiente", className: "bg-red-100 text-red-700" },
  cancelada: { label: "Cancelada", className: "bg-zinc-100 text-zinc-700" },
  vencida: { label: "Vencida", className: "bg-zinc-100 text-zinc-700" },
  fallida: { label: "No se completó", className: "bg-zinc-100 text-zinc-700" },
};

export const PAYMENT_STATUS: Record<SubscriptionPayment["status"], { label: string; className: string }> = {
  PENDING: { label: "En proceso", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Aprobado", className: "bg-emerald-100 text-emerald-800" },
  DECLINED: { label: "Rechazado", className: "bg-red-100 text-red-700" },
  VOIDED: { label: "Anulado", className: "bg-zinc-100 text-zinc-700" },
  ERROR: { label: "Error", className: "bg-red-100 text-red-700" },
};

export const PLAN_ROLE_LABELS: Record<MembershipPlan["grants_role"], string> = {
  kit: "Solo Kit COD",
  member: "Academia completa",
};

export const INTERVALS = [
  { days: 30, label: "Mensual" },
  { days: 90, label: "Trimestral" },
  { days: 180, label: "Semestral" },
  { days: 365, label: "Anual" },
] as const;

export const intervalLabel = (days: number) =>
  INTERVALS.find((i) => i.days === days)?.label.toLowerCase() ?? `cada ${days} días`;

export const formatCop = (value: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
