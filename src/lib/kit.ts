/** Utilidades compartidas por las herramientas del Kit COD. */

export const CURRENCIES = [
  { code: "COP", label: "🇨🇴 Peso colombiano (COP)", decimals: 0 },
  { code: "MXN", label: "🇲🇽 Peso mexicano (MXN)", decimals: 0 },
  { code: "USD", label: "🇺🇸 Dólar (USD) · Ecuador, Panamá", decimals: 2 },
  { code: "PEN", label: "🇵🇪 Sol peruano (PEN)", decimals: 2 },
  { code: "CLP", label: "🇨🇱 Peso chileno (CLP)", decimals: 0 },
  { code: "GTQ", label: "🇬🇹 Quetzal (GTQ)", decimals: 2 },
  { code: "ARS", label: "🇦🇷 Peso argentino (ARS)", decimals: 0 },
  { code: "PYG", label: "🇵🇾 Guaraní (PYG)", decimals: 0 },
  { code: "EUR", label: "🇪🇸 Euro (EUR) · España", decimals: 2 },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const COUNTRIES = [
  "Colombia",
  "México",
  "Ecuador",
  "Perú",
  "Chile",
  "Guatemala",
  "Panamá",
  "Paraguay",
  "Argentina",
  "España",
] as const;

export function moneyFormatter(currency: string) {
  const meta = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const f = new Intl.NumberFormat("es", {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: meta.decimals,
    minimumFractionDigits: 0,
  });
  return (n: number) => (Number.isFinite(n) ? f.format(n) : "—");
}

export const toNum = (raw: string | undefined) => {
  const n = parseFloat((raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const pct = (n: number, digits = 1) => (Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—");

/** Lee y guarda estado en localStorage sin romper si no está disponible. */
export function loadLocal<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento disponible
  }
}

/** Lunes de la semana de una fecha (YYYY-MM-DD). */
export function weekStart(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

/** Formatos de video para el guion IA. */
export const VIDEO_FORMATS = [
  { id: "mismo", label: "El mismo formato del video" },
  { id: "ugc", label: "UGC con presentador IA" },
  { id: "demo", label: "Problema → solución" },
  { id: "antes_despues", label: "Antes y después" },
  { id: "esqueleto", label: "Esqueleto educativo" },
  { id: "animado", label: "Historia animada 3D" },
  { id: "objeto", label: "El producto que habla" },
  { id: "pov", label: "POV / unboxing" },
] as const;
