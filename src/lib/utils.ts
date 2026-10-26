export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string | null | undefined, fallback = "?") {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** "hace 3 h", "hace 2 días"... */
export function timeAgo(date: string | Date) {
  const diff = (new Date(date).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return "justo ahora";
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Nombre de archivo seguro para Storage (sin tildes ni espacios). */
export function safeFileName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${Date.now()}-${clean || "archivo"}`;
}

export function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function strOrNull(formData: FormData, key: string) {
  return str(formData, key) || null;
}

/** Traduce los errores más comunes de Supabase Auth al cambiar contraseña. */
export function passwordErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "same_password") return "La nueva contraseña debe ser distinta de la anterior.";
  if (error.code === "weak_password") return "La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.";
  if (error.code === "reauthentication_needed" || error.code === "session_not_found") {
    return "Tu sesión ha caducado. Pide un enlace nuevo.";
  }
  return `No se pudo cambiar la contraseña: ${error.message}`;
}

/** Solo enlaces http(s); cualquier otra cosa (javascript:, data:...) se descarta. */
export function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
