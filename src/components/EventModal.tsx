"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CalendarPlus, Clock, MapPin, Pencil, Repeat, Users, Video, X } from "lucide-react";
import { RECURRENCE_LABELS } from "@/lib/constants";
import { googleCalendarUrl, type Occurrence } from "@/lib/recurrence";
import { Markdown } from "./Markdown";

export function formatOccurrence(occ: Occurrence) {
  const day = occ.start.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  const time = (d: Date) => d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time(occ.start)} – ${time(occ.end)}`;
}

export function EventModal({ occ, isStaff, onClose }: { occ: Occurrence; isStaff: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { event } = occ;
  const isLive = Date.now() >= occ.start.getTime() - 15 * 60_000 && Date.now() <= occ.end.getTime();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{event.title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm px-1.5" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-zinc-600">
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" /> {formatOccurrence(occ)}
          </li>
          {event.recurrence !== "none" && (
            <li className="flex items-center gap-2">
              <Repeat className="size-4 shrink-0" /> {RECURRENCE_LABELS[event.recurrence]}
            </li>
          )}
          {event.location && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" /> {event.location}
            </li>
          )}
          {isStaff && event.audience && (
            <li className="flex items-center gap-2">
              <Users className="size-4 shrink-0" /> {event.audience}
            </li>
          )}
        </ul>

        <Markdown className="mt-4">{event.description}</Markdown>

        <div className="mt-6 flex flex-wrap gap-2">
          {event.meeting_url && (
            <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <Video className="size-4" /> {isLive ? "Unirse ahora" : "Enlace de la llamada"}
            </a>
          )}
          <a href={googleCalendarUrl(occ)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <CalendarPlus className="size-4" /> Añadir a Google Calendar
          </a>
          {isStaff && (
            <Link href={`/calendario/${event.id}/editar`} className="btn btn-secondary">
              <Pencil className="size-4" /> Editar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
