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
