"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Video } from "lucide-react";
import { SESSION_TOPICS } from "@/lib/constants";
import type { StudySession } from "@/lib/types";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { useMounted } from "@/components/useMounted";
import type { SessionFormState } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Action = (prev: SessionFormState, formData: FormData) => Promise<SessionFormState>;

export function SessionForm(props: { action: Action; session?: StudySession; cancelHref: string }) {
  const mounted = useMounted();
  if (!mounted) return <div className="card h-[560px] animate-pulse" />;
  return <Form {...props} />;
}

function Form({ action, session, cancelHref }: { action: Action; session?: StudySession; cancelHref: string }) {
  const [state, formAction] = useActionState(action, null);
  const initial = useMemo(() => {
    if (session) return new Date(session.starts_at);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return d;
  }, [session]);
  const [date, setDate] = useState(toDateInput(initial));
  const [time, setTime] = useState(toTimeInput(initial));

  const startsAt = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    if (!y || Number.isNaN(h)) return "";
    return new Date(y, m - 1, d, h, min || 0).toISOString();
  }, [date, time]);

  return (
    <form action={formAction} className="card space-y-5 p-6">
      {session && <input type="hidden" name="id" value={session.id} />}
      <input type="hidden" name="starts_at" value={startsAt} />
      <FormMessage error={state?.error} />

      <div>
        <label className="label" htmlFor="title">Título</label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={session?.title}
          className="input"
          placeholder="Ej: Revisemos nuestras tiendas · Buscando productos ganadores"
        />
      </div>

      <div>
        <label className="label" htmlFor="topic">Tema</label>
        <select id="topic" name="topic" defaultValue={session?.topic ?? "general"} className="input">
          {SESSION_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
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
          <select id="duration_minutes" name="duration_minutes" defaultValue={session?.duration_minutes ?? 60} className="input">
            {[30, 45, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-3 text-xs text-zinc-500">
        Hora en tu zona horaria ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Cada alumno la verá en la suya.
      </p>

      <div>
        <label className="label" htmlFor="meet_url">Enlace de Google Meet</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="meet_url"
            name="meet_url"
            type="url"
            required
            defaultValue={session?.meet_url ?? ""}
            className="input min-w-0 flex-1"
            placeholder="https://meet.google.com/abc-defg-hij"
          />
          <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <Video className="size-4" /> Crear enlace de Meet <ExternalLink className="size-3.5" />
          </a>
        </div>
        <p className="hint">Pulsa «Crear enlace de Meet», copia el enlace de la reunión y pégalo aquí.</p>
      </div>

      <div>
        <label className="label" htmlFor="max_attendees">Máximo de asistentes (opcional, sin contarte a ti)</label>
        <input
          id="max_attendees"
          name="max_attendees"
          type="number"
          min={2}
          max={500}
          defaultValue={session?.max_attendees ?? ""}
          className="input max-w-40"
          placeholder="Sin límite"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">¿De qué va la sesión?</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={session?.description ?? ""}
          className="input"
          placeholder="Qué vamos a hacer, qué traer preparado, nivel recomendado..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn btn-secondary">Cancelar</Link>
        <SubmitButton pendingText="Guardando...">{session ? "Guardar cambios" : "Crear sesión"}</SubmitButton>
      </div>
    </form>
  );
}
