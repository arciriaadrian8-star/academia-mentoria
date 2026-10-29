"use client";

import { useMounted } from "./useMounted";

/** Fecha y hora en la zona horaria de quien mira (evita mostrar la hora del servidor). */
export function LocalTime({ date, withWeekday = true }: { date: string; withWeekday?: boolean }) {
  const mounted = useMounted();
  if (!mounted) return <span className="inline-block h-3 w-28 animate-pulse rounded bg-zinc-100 align-middle" />;
  const d = new Date(date);
  return (
    <span className="first-letter:uppercase">
      {d.toLocaleDateString("es", { weekday: withWeekday ? "long" : undefined, day: "numeric", month: "short" })} ·{" "}
      {d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
