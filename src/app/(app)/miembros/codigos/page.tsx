import Link from "next/link";
import { ArrowLeft, KeyRound, Trash2 } from "lucide-react";
import { getSettings, requireAdmin } from "@/lib/auth";
import { CODE_DURATIONS, durationLabel } from "@/lib/accessCodes";
import { getOrigin } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteCode, generateCodes } from "./actions";

type CodeRow = {
  code: string;
  days: number | null;
  note: string | null;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
};

const FILTERS = [
  { id: "disponibles", label: "Disponibles" },
  { id: "usados", label: "Usados" },
  { id: "todos", label: "Todos" },
] as const;

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

export default async function AccessCodesPage({ searchParams }: { searchParams: Promise<{ nuevos?: string; estado?: string }> }) {
  const { nuevos, estado } = await searchParams;
  const filter = FILTERS.some((f) => f.id === estado) ? estado! : "disponibles";
  const { supabase } = await requireAdmin();
  const [{ data }, settings, origin] = await Promise.all([
    supabase.from("access_codes").select("code, days, note, created_at, used_by, used_at").order("created_at", { ascending: false }).limit(500),
    getSettings(),
    getOrigin(),
  ]);
  const all = (data ?? []) as CodeRow[];
  const available = all.filter((c) => !c.used_at).length;
  const codes = all.filter((c) => (filter === "todos" ? true : filter === "usados" ? c.used_at : !c.used_at));

  const userIds = [...new Set(all.map((c) => c.used_by).filter(Boolean))] as string[];
  const { data: users } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string | null) => users?.find((u) => u.id === id)?.full_name || "Alumno";

  const linkFor = (code: string) => `${origin}/kit-acceso?codigo=${code}`;
  const messageFor = (c: CodeRow) =>
    `Hola 👋 Este es tu acceso al Kit COD de ${settings.academy_name}.\n\n` +
    `1. Entra aquí: ${linkFor(c.code)}\n` +
    `2. Crea tu cuenta con tu email y una contraseña.\n\n` +
    `Tu código: ${c.code}\n` +
    `Acceso: ${durationLabel(c.days)}. Es personal y sirve una sola vez.`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/miembros" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Miembros
      </Link>
      <PageHeader
        title="Códigos del Kit COD"
        description="Cada código crea una cuenta «Solo Kit»: entra únicamente a las 6 herramientas del Kit COD (no ve cursos, comunidad ni nada más). Cada código sirve una sola vez."
      />

      <form action={generateCodes} className="card mb-6 grid gap-4 p-5 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="quantity">Cantidad</label>
          <input id="quantity" name="quantity" type="number" min={1} max={50} defaultValue={1} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="days">Duración del acceso</label>
          <select id="days" name="days" defaultValue={30} className="input">
            {CODE_DURATIONS.map((d) => (
              <option key={d.days} value={d.days}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="note">Nota (opcional)</label>
          <input id="note" name="note" maxLength={200} placeholder="Ej.: Make Drop AI · Juan Pérez" className="input" />
        </div>
        <SubmitButton pendingText="Generando...">
          <KeyRound className="size-4" /> Generar
        </SubmitButton>
      </form>

      {nuevos && (
        <div className="mb-4">
          <FormMessage success={`Se ${nuevos === "1" ? "creó 1 código" : `crearon ${nuevos} códigos`}. Pulsa «Copiar mensaje» y envíaselo a cada alumno por WhatsApp o email.`} />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/miembros/codigos?estado=${f.id}`}
            className={cn("chip", filter === f.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")}
          >
            {f.label}
            {f.id === "disponibles" && ` (${available})`}
          </Link>
        ))}
      </div>

      {codes.length === 0 ? (
        <EmptyState icon={<KeyRound className="size-10" />} title={filter === "usados" ? "Aún no se ha usado ningún código" : "No hay códigos disponibles"}>
          {filter !== "usados" && "Genera códigos arriba para dar acceso al Kit COD."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {codes.map((c) => (
            <li key={c.code} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold tracking-wide">{c.code}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {durationLabel(c.days)} · creado el {shortDate(c.created_at)}
                  {c.note && <> · {c.note}</>}
                </p>
              </div>
              {c.used_at ? (
                <span className="chip bg-zinc-100 text-zinc-700">
                  Usado por{" "}
                  {c.used_by ? (
                    <Link href={`/miembros/${c.used_by}`} className="ml-1 font-semibold hover:underline">{nameOf(c.used_by)}</Link>
                  ) : (
                    " una cuenta borrada"
                  )}
                  {" "}· {shortDate(c.used_at)}
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-emerald-100 text-emerald-800">Disponible</span>
                  <CopyButton text={messageFor(c)} label="Copiar mensaje" />
                  <CopyButton text={linkFor(c.code)} label="Copiar enlace" />
                  <form action={deleteCode}>
                    <input type="hidden" name="code" value={c.code} />
                    <ConfirmButton message={`¿Borrar el código ${c.code}? Ya no se podrá usar.`} className="btn-sm" aria-label="Borrar código">
                      <Trash2 className="size-3.5" />
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
