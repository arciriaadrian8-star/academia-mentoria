import type { CalendarEvent } from "./types";

export interface Occurrence {
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
}

function nthOccurrence(first: Date, recurrence: CalendarEvent["recurrence"], n: number): Date | null {
  const d = new Date(first);
  if (recurrence === "weekly") d.setDate(first.getDate() + 7 * n);
  else if (recurrence === "biweekly") d.setDate(first.getDate() + 14 * n);
  else if (recurrence === "monthly") {
    d.setDate(1);
    d.setMonth(first.getMonth() + n);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (first.getDate() > daysInMonth) return null; // ej: día 31 en un mes de 30 días
    d.setDate(first.getDate());
  }
  return d;
}

/** Expande los eventos (incluidos los repetitivos) dentro de un rango, en la hora local del navegador. */
export function expandEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const result: Occurrence[] = [];

  for (const event of events) {
    const first = new Date(event.starts_at);
    const durationMs = event.duration_minutes * 60_000;
    let until: Date | null = null;
    if (event.recurrence_until) {
      const [y, m, d] = event.recurrence_until.split("-").map(Number);
      until = new Date(y, m - 1, d, 23, 59, 59);
    }

    const maxIterations = event.recurrence === "none" ? 1 : 2000;
    for (let n = 0; n < maxIterations; n++) {
      const start = n === 0 ? first : nthOccurrence(first, event.recurrence, n);
      if (!start) continue;
      if (start > rangeEnd || (until && start > until)) break;
      const end = new Date(start.getTime() + durationMs);
      if (end >= rangeStart) {
        result.push({ key: `${event.id}-${start.getTime()}`, event, start, end });
      }
    }
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const pad = (n: number) => String(n).padStart(2, "0");
const toGoogleDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

export function googleCalendarUrl(occ: Occurrence) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: occ.event.title,
    dates: `${toGoogleDate(occ.start)}/${toGoogleDate(occ.end)}`,
    details: [occ.event.description, occ.event.meeting_url].filter(Boolean).join("\n\n"),
    location: occ.event.meeting_url || occ.event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
