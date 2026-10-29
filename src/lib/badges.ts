import type { LeaderboardRow } from "./types";

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: boolean;
}

/** Medallas que se ganan solas con la actividad en la academia. */
export function badgesFor(row: Pick<LeaderboardRow, "lessons" | "posts" | "comments" | "likes" | "hosted" | "joined"> | null): Badge[] {
  const r = row ?? { lessons: 0, posts: 0, comments: 0, likes: 0, hosted: 0, joined: 0 };
  return [
    { id: "first-lesson", emoji: "🎬", name: "Primer paso", description: "Completa tu primera lección", earned: r.lessons >= 1 },
    { id: "student", emoji: "📚", name: "Estudioso", description: "Completa 10 lecciones", earned: r.lessons >= 10 },
    { id: "scholar", emoji: "🎓", name: "Graduado", description: "Completa 50 lecciones", earned: r.lessons >= 50 },
    { id: "first-post", emoji: "👋", name: "Presentado", description: "Publica en la comunidad", earned: r.posts >= 1 },
    { id: "helper", emoji: "🤝", name: "Ayudante", description: "Escribe 20 comentarios", earned: r.comments >= 20 },
    { id: "popular", emoji: "🔥", name: "Inspirador", description: "Recibe 25 likes", earned: r.likes >= 25 },
    { id: "team", emoji: "🧑‍🤝‍🧑", name: "En equipo", description: "Únete a una sesión grupal", earned: r.joined >= 1 },
    { id: "host", emoji: "🎤", name: "Anfitrión", description: "Organiza una sesión con asistentes", earned: r.hosted >= 1 },
    { id: "leader", emoji: "🏅", name: "Líder", description: "Organiza 5 sesiones con asistentes", earned: r.hosted >= 5 },
  ];
}
