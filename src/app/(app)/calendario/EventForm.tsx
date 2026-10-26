"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RECURRENCE_LABELS } from "@/lib/constants";
import type { AccessLevel, CalendarEvent, Recurrence } from "@/lib/types";
import { LevelPicker } from "@/components/LevelPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { useMounted } from "@/components/useMounted";

interface MemberOption {
  id: string;
  full_name: string;
  email: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function EventForm(props: {
  action: (formData: FormData) => Promise<void>;
  event?: CalendarEvent;
  levels: AccessLevel[];
  members: MemberOption[];
  selectedLevels: string[];
  selectedMembers: string[];
  defaultMember?: string;
}) {
  const mounted = useMounted();
  if (!mounted) return <div className="card h-[600px] animate-pulse" />;
  return <Form {...props} />;
}

function Form({ action, event, levels, members, selectedLevels, selectedMembers, defaultMember }: Parameters<typeof EventForm>[0]) {
  const initial = useMemo(() => {
    if (event) return new Date(event.starts_at);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d;
  }, [event]);

  const [date, setDate] = useState(toDateInput(initial));
  const [time, setTime] = useState(toTimeInput(initial));
  const [recurrence, setRecurrence] = useState<Recurrence>(event?.recurrence ?? "none");
  const [memberFilter, setMemberFilter] = useState("");
  const [checkedMembers, setCheckedMembers] = useState<string[]>(
    defaultMember ? [...selectedMembers, defaultMember] : selectedMembers,
  );

  const startsAt = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    if (!y || Number.isNaN(h)) return "";
    return new Date(y, m - 1, d, h, min || 0).toISOString();
  }, [date, time]);

  const filteredMembers = members.filter((m) =>
    `${m.full_name} ${m.email}`.toLowerCase().includes(memberFilter.toLowerCase()),
  );

  return (
    <form action={action} className="card space-y-6 p-6">
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="starts_at" value={startsAt} />

      <div>
        <label className="label" htmlFor="title">Título</label>
        <input id="title" name="title" required defaultValue={event?.title} className="input" placeholder="Ej: Q&A semanal en directo" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="date">Fecha</label>
          <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="time">Hora</label>
          <input id="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="duration_minutes">Duración</label>
          <select id="duration_minutes" name="duration_minutes" defaultValue={event?.duration_minutes ?? 60} className="input">
            {[15, 30, 45, 60, 75, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-4 text-xs text-zinc-500">
        Hora en tu zona horaria ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Cada miembro la verá convertida a la suya.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="recurrence">Repetir</label>
          <select id="recurrence" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className="input">
            {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {recurrence !== "none" && (
          <div>
            <label className="label" htmlFor="recurrence_until">Hasta (opcional)</label>
            <input id="recurrence_until" name="recurrence_until" type="date" defaultValue={event?.recurrence_until ?? ""} className="input" />
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="meeting_url">Enlace de la llamada</label>
        <input id="meeting_url" name="meeting_url" type="url" defaultValue={event?.meeting_url ?? ""} className="input" placeholder="https://zoom.us/j/... o https://meet.google.com/..." />
      </div>

      <div>
        <label className="label" htmlFor="location">Lugar (opcional)</label>
        <input id="location" name="location" defaultValue={event?.location ?? ""} className="input" placeholder="Ej: Online, Madrid..." />
      </div>

      <div>
        <label className="label" htmlFor="description">Descripción</label>
        <textarea id="description" name="description" rows={4} defaultValue={event?.description ?? ""} className="input" placeholder="Agenda, qué preparar, etc." />
      </div>

      <fieldset className="space-y-4 rounded-xl border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-semibold">¿Quién puede verlo?</legend>
        <p className="text-xs text-zinc-500">
          Si no eliges nada, lo verán <strong>todos los miembros</strong>. Para una sesión 1 a 1, marca solo a ese miembro.
        </p>
        <div>
          <span className="label">Por nivel de acceso</span>
          <LevelPicker levels={levels} selected={selectedLevels} />
        </div>
        <div>
          <span className="label">Miembros concretos</span>
          <input value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} placeholder="Buscar miembro..." className="input mb-2 py-1.5" />
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
            {members.length === 0 && <p className="p-2 text-sm text-zinc-500">Todavía no hay miembros.</p>}
            {members.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 ${filteredMembers.includes(m) ? "" : "hidden"}`}
              >
                <input
                  type="checkbox"
                  name="members"
                  value={m.id}
                  checked={checkedMembers.includes(m.id)}
                  onChange={(e) =>
                    setCheckedMembers(e.target.checked ? [...checkedMembers, m.id] : checkedMembers.filter((id) => id !== m.id))
                  }
                  className="accent-brand"
                />
                <span className="font-medium">{m.full_name || m.email}</span>
                {m.full_name && <span className="truncate text-xs text-zinc-400">{m.email}</span>}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Link href="/calendario" className="btn btn-secondary">Cancelar</Link>
        <SubmitButton pendingText="Guardando...">{event ? "Guardar cambios" : "Crear evento"}</SubmitButton>
      </div>
    </form>
  );
}
