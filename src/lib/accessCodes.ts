/** Códigos de acceso «Solo Kit»: formato KIT-XXXX-XXXX-XXXX (sin letras que se confunden). */

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Acepta el código con o sin guiones, espacios o minúsculas. Devuelve null si no tiene el formato. */
export function normalizeCode(raw: string | null | undefined) {
  const clean = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = clean.startsWith("KIT") && clean.length === 15 ? clean.slice(3) : clean;
  if (!/^[A-Z0-9]{12}$/.test(body)) return null;
  return `KIT-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

export const CODE_DURATIONS = [
  { days: 30, label: "30 días (1 mes)" },
  { days: 60, label: "60 días (2 meses)" },
  { days: 90, label: "90 días (3 meses)" },
  { days: 180, label: "180 días (6 meses)" },
  { days: 365, label: "365 días (1 año)" },
  { days: 0, label: "Sin vencimiento" },
] as const;

export function durationLabel(days: number | null) {
  if (!days) return "Sin vencimiento";
  return days % 30 === 0 && days < 365 ? `${days / 30} ${days === 30 ? "mes" : "meses"}` : `${days} días`;
}

/** Mensaje de error para los fallos de redeem_access_code. */
export function redeemErrorMessage(message: string | undefined) {
  const m = message ?? "";
  if (m.includes("codigo_invalido")) return "Ese código no existe. Revisa que esté bien escrito.";
  if (m.includes("codigo_usado")) return "Ese código ya fue usado. Cada código sirve una sola vez.";
  if (m.includes("acceso_completo")) return "Tu cuenta ya tiene acceso completo a la academia; no necesitas código.";
  return "No se pudo activar el código. Inténtalo de nuevo en unos minutos.";
}

/** Fecha para un <input type="date"> en hora de Colombia/Perú/Ecuador (UTC-5). */
export function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function formatAccessDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}
