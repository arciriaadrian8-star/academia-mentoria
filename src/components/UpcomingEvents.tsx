"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { expandEvents, type Occurrence } from "@/lib/recurrence";
import type { CalendarEvent } from "@/lib/types";
import { EventModal } from "./EventModal";
import { useMounted } from "./useMounted";

export function UpcomingEvents({ events, isStaff, limit = 3 }: { events: CalendarEvent[]; isStaff: boolean; limit?: number }) {
  const mounted = useMounted();
  const [open, setOpen] = useState<Occurrence | null>(null);
  const upcoming = useMemo(() => {
    if (!mounted) return [];
    const now = new Date();
    return expandEvents(events, now, new Date(now.getTime() + 60 * 24 * 3600 * 1000)).slice(0, limit);
  }, [events, limit, mounted]);

  if (!mounted) return <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />;
  if (upcoming.length === 0) {
    return <p className="text-sm text-zinc-500">No hay eventos próximos.</p>;
  }
  return (
    <>
      <ul className="space-y-2">
        {upcoming.map((o) => (
          <li key={o.key}>
            <button onClick={() => setOpen(o)} className="w-full rounded-lg p-2 text-left hover:bg-zinc-50">
              <p className="truncate text-sm font-semibold">{o.event.title}</p>
              <p className="text-xs text-zinc-500 first-letter:uppercase">
                {o.start.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" })} ·{" "}
                {o.start.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <Link href="/calendario" className="mt-2 block text-center text-xs font-semibold text-brand hover:underline">
        Ver calendario
      </Link>
      {open && <EventModal occ={open} isStaff={isStaff} onClose={() => setOpen(null)} />}
    </>
  );
}
