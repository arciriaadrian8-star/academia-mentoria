import type { Recurrence, Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  coach: "Coach",
  member: "Miembro",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Control total: contenido, calendario, miembros y ajustes.",
  coach: "Puede crear cursos, lecciones y eventos y moderar la comunidad.",
  member: "Ve el contenido de sus niveles de acceso y participa en la comunidad.",
};

export const POST_CATEGORIES = [
  { id: "general", label: "💬 General", staffOnly: false },
  { id: "anuncios", label: "📢 Anuncios", staffOnly: true },
  { id: "preguntas", label: "❓ Preguntas", staffOnly: false },
  { id: "logros", label: "🏆 Logros", staffOnly: false },
  { id: "recursos", label: "📚 Recursos", staffOnly: false },
] as const;

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "No se repite",
  weekly: "Cada semana",
  biweekly: "Cada 2 semanas",
  monthly: "Cada mes",
};

export const LEVEL_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"];

export const PLATFORM_CATEGORIES = [
  { id: "proveedores", label: "📦 Proveedores y logística" },
  { id: "tiendas", label: "🛒 Tiendas" },
  { id: "anuncios", label: "📣 Anuncios" },
  { id: "ia", label: "🤖 Inteligencia artificial" },
  { id: "diseno", label: "🎨 Diseño y video" },
  { id: "investigacion", label: "🔎 Investigación de producto" },
  { id: "otros", label: "🧰 Otros" },
] as const;

export const SESSION_TOPICS = [
  { id: "general", label: "💬 General" },
  { id: "producto", label: "🔎 Búsqueda de producto" },
  { id: "anuncios", label: "📣 Anuncios y creativos" },
  { id: "tienda", label: "🛒 Tienda y landing" },
  { id: "logistica", label: "📦 Logística y Dropi" },
  { id: "mentalidad", label: "🧠 Mentalidad y hábitos" },
  { id: "coworking", label: "⏱️ Coworking (trabajar juntos)" },
] as const;

/** Rangos del ranking según los puntos acumulados. */
export const RANKS = [
  { min: 0, name: "Novato", emoji: "🌱" },
  { min: 100, name: "Aprendiz", emoji: "📘" },
  { min: 300, name: "Emprendedor", emoji: "🚀" },
  { min: 700, name: "Vendedor", emoji: "💰" },
  { min: 1500, name: "Escalador", emoji: "📈" },
  { min: 3000, name: "Élite", emoji: "👑" },
] as const;

export const POINTS = { lesson: 10, post: 5, comment: 2, like: 1, hosted: 15, joined: 5 } as const;

export function rankFor(points: number) {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (points >= rank.min) index = i;
  });
  const next = RANKS[index + 1];
  return { ...RANKS[index], index, next: next ?? null };
}
