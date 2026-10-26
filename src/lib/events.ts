import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessLevel, CalendarEvent } from "./types";

/** Eventos visibles para el usuario (la base de datos ya filtra por permisos). */
export async function getEvents(supabase: SupabaseClient, withAudience: boolean): Promise<CalendarEvent[]> {
  const since = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("events")
    .select("*")
    .or(`recurrence.neq.none,starts_at.gte.${since}`)
    .order("starts_at");
  const events = (data ?? []) as CalendarEvent[];
  if (!withAudience || events.length === 0) return events;

  const [accessRes, membersRes, levelsRes, profilesRes] = await Promise.all([
    supabase.from("event_access").select("event_id, access_level_id"),
    supabase.from("event_members").select("event_id, user_id"),
    supabase.from("access_levels").select("id, name, color"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const levels = (levelsRes.data ?? []) as AccessLevel[];
  const profiles = profilesRes.data ?? [];

  return events.map((event) => {
    const levelNames = (accessRes.data ?? [])
      .filter((a) => a.event_id === event.id)
      .map((a) => levels.find((l) => l.id === a.access_level_id)?.name)
      .filter(Boolean);
    const memberNames = (membersRes.data ?? [])
      .filter((m) => m.event_id === event.id)
      .map((m) => {
        return profiles.find((profile) => profile.id === m.user_id)?.full_name || "Miembro";
      })
      .filter(Boolean);
    const parts = [];
    if (levelNames.length) parts.push(`Niveles: ${levelNames.join(", ")}`);
    if (memberNames.length) parts.push(`Miembros: ${memberNames.join(", ")}`);
    return { ...event, audience: parts.length ? parts.join(" · ") : "Todos los miembros" };
  });
}
