"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import { expandEvents, sameDay, type Occurrence } from "@/lib/recurrence";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EventModal, formatOccurrence } from "@/components/EventModal";
import { useMounted } from "@/components/useMounted";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const time = (d: Date) => d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

export function CalendarView({ events, isStaff }: { events: CalendarEvent[]; isStaff: boolean }) {
  const mounted = useMounted();
  if (!mounted) return <div className="card h-[600px] animate-pulse" />;
  return <Calendar events={events} isStaff={isStaff} />;
}

function Calendar({ events, isStaff }: { events: CalendarEvent[]; isStaff: boolean }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [open, setOpen] = useState<Occurrence | null>(null);

  const { days, occurrences } = useMemo(() => {
    const offset = (month.getDay() + 6) % 7; // semana empieza en lunes
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
    const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const totalCells = Math.ceil((offset + lastOfMonth.getDate()) / 7) * 7;
    const days = Array.from({ length: totalCells }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const end = new Date(days[days.length - 1].getFullYear(), days[days.length - 1].getMonth(), days[days.length - 1].getDate(), 23, 59, 59);
    return { days, occurrences: expandEvents(events, start, end) };
  }, [events, month]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return expandEvents(events, now, new Date(now.getTime() + 120 * 24 * 3600 * 1000)).slice(0, 8);
  }, [events]);

  const dayEvents = (day: Date) => occurrences.filter((o) => sameDay(o.start, day));
  const monthLabel = month.toLocaleDateString("es", { month: "long", year: "numeric" });
  const selectedEvents = dayEvents(selectedDay);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <h2 className="text-lg font-bold first-letter:uppercase">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDay(today);
                }}
              >
                Hoy
              </button>
              <button className="btn btn-ghost btn-sm px-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mes anterior">
                <ChevronLeft className="size-4" />
              </button>
              <button className="btn btn-ghost btn-sm px-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mes siguiente">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-zinc-100 text-center text-xs font-semibold text-zinc-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const list = dayEvents(day);
              const inMonth = day.getMonth() === month.getMonth();
              const isToday = sameDay(day, today);
              const isSelected = sameDay(day, selectedDay);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "min-h-16 cursor-pointer border-r border-b border-zinc-100 p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-zinc-50/70",
                    isSelected && "bg-brand/5",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-brand text-white" : inMonth ? "text-zinc-800" : "text-zinc-400",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {/* móvil: puntos */}
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {list.slice(0, 4).map((o) => (
                      <span key={o.key} className="size-1.5 rounded-full bg-brand" />
                    ))}
                  </div>
                  {/* escritorio: títulos */}
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {list.slice(0, 3).map((o) => (
                      <button
                        key={o.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(o);
                        }}
                        className="block w-full truncate rounded-md bg-brand/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-brand hover:bg-brand/20"
                      >
                        {time(o.start)} {o.event.title}
                      </button>
                    ))}
                    {list.length > 3 && <p className="px-1.5 text-[11px] text-zinc-500">+{list.length - 3} más</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold first-letter:uppercase">
            {selectedDay.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay eventos este día.</p>
          ) : (
            <EventList items={selectedEvents} onOpen={setOpen} />
          )}
        </div>
        <p className="text-xs text-zinc-400">Horarios mostrados en tu zona horaria ({timezone}).</p>
      </div>

      <aside className="card p-4 lg:sticky lg:top-32">
        <h3 className="mb-3 text-sm font-semibold">Próximos eventos</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay eventos programados.</p>
        ) : (
          <EventList items={upcoming} onOpen={setOpen} showDate />
        )}
      </aside>

      {open && <EventModal occ={open} isStaff={isStaff} onClose={() => setOpen(null)} />}
    </div>
  );
}

function EventList({ items, onOpen, showDate }: { items: Occurrence[]; onOpen: (o: Occurrence) => void; showDate?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((o) => (
        <li key={o.key}>
          <button onClick={() => onOpen(o)} className="flex w-full items-start gap-3 rounded-xl border border-zinc-200 p-3 text-left hover:border-brand/40 hover:bg-brand/5">
            <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-brand/10 py-1 text-brand">
              <span className="text-[10px] font-semibold uppercase">{o.start.toLocaleDateString("es", { month: "short" })}</span>
              <span className="text-lg leading-none font-bold">{o.start.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{o.event.title}</p>
              <p className="text-xs text-zinc-500">{showDate ? formatOccurrence(o) : `${time(o.start)} – ${time(o.end)}`}</p>
            </div>
            {o.event.meeting_url && <Video className="mt-1 size-4 shrink-0 text-zinc-400" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
