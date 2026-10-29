import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clapperboard, Lightbulb, Search, Trash2 } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { VIDEO_FORMATS } from "@/lib/kit";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { deleteScript } from "../actions";
import { AutoRefresh } from "./AutoRefresh";

type Scene = {
  numero: number;
  segundos: string;
  tramo: string;
  que_se_ve: string;
  voz: string;
  texto_pantalla?: string;
  prompt_imagen?: string;
  prompt_video: string;
};
type Result = {
  analisis: {
    resumen: string;
    formato: string;
    duracion_segundos?: number;
    gancho: { que_pasa: string; texto_pantalla?: string; por_que_funciona: string };
    estructura: { tramo: string; segundos: string; que_pasa: string; objetivo: string }[];
    angulo: string;
    elementos_clave: string[];
    llamado_accion: string;
  };
  guion: {
    titulo: string;
    formato: string;
    duracion_segundos?: number;
    personaje?: string;
    escenas: Scene[];
    texto_anuncio: string;
    titulos: string[];
  };
  variantes_gancho: string[];
  consejos: string[];
};

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireActive();
  const { data: row } = await supabase.from("ai_scripts").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();

  const back = (
    <Link href="/kit/video-ia" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft className="size-4" /> Mis guiones
    </Link>
  );
  const format = VIDEO_FORMATS.find((f) => f.id === row.format)?.label ?? row.format;

  const stale = row.status === "procesando" && Date.now() - new Date(row.created_at).getTime() > 6 * 60 * 1000;
  if (stale) {
    row.status = "error";
    row.error = "El análisis tardó demasiado y se canceló. Prueba con un video más corto (15 a 60 segundos) o más liviano.";
  }

  if (row.status === "procesando") {
    return (
      <>
        {back}
        <PageHeader title={row.product} description={`Formato: ${format}`} />
        <AutoRefresh since={row.created_at} />
      </>
    );
  }

  const actions = (
    <form action={deleteScript}>
      <input type="hidden" name="id" value={row.id} />
      <ConfirmButton message="¿Borrar este guion?" className="btn-secondary btn-sm">
        <Trash2 className="size-3.5" /> Borrar
      </ConfirmButton>
    </form>
  );

  if (row.status === "error" || !row.result) {
    return (
      <>
        {back}
        <PageHeader title={row.product}>{actions}</PageHeader>
        <div className="card border-l-4 border-l-red-400 p-5">
          <p className="font-semibold">No se pudo generar el guion</p>
          <p className="mt-1 text-sm text-zinc-600">{row.error || "Error desconocido."}</p>
          <Link href="/kit/video-ia" className="btn btn-primary mt-4">Intentar con otro video</Link>
        </div>
      </>
    );
  }

  const r = row.result as Result;
  const a = r.analisis;
  const g = r.guion;
  const fullScript = [
    `${g.titulo} (${g.formato})`,
    g.personaje ? `\nPERSONAJE: ${g.personaje}` : "",
    ...g.escenas.map(
      (s) =>
        `\nESCENA ${s.numero} · ${s.segundos} · ${s.tramo}\nSe ve: ${s.que_se_ve}\nVoz: "${s.voz}"${s.texto_pantalla ? `\nTexto en pantalla: ${s.texto_pantalla}` : ""}\nPrompt Flow/Veo: ${s.prompt_video}${s.prompt_imagen ? `\nPrompt imagen: ${s.prompt_imagen}` : ""}`,
    ),
    `\nTEXTO DEL ANUNCIO:\n${g.texto_anuncio}`,
    `\nTÍTULOS:\n${g.titulos.map((t) => `• ${t}`).join("\n")}`,
  ].join("\n");

  return (
    <>
      {back}
      <PageHeader title={g.titulo || row.product} description={`${row.product} · ${format} · ${row.country}`}>
        <CopyButton text={fullScript} label="Copiar guion completo" />
        {actions}
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><Clapperboard className="size-5 text-brand" /> Tu guion · {g.formato}</h2>
            {g.duracion_segundos ? <p className="text-xs text-zinc-500">Duración: {g.duracion_segundos} s</p> : null}
            {g.personaje && (
              <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p><strong>Personaje (pégalo igual en cada escena):</strong> {g.personaje}</p>
                  <CopyButton text={g.personaje} />
                </div>
              </div>
            )}
          </section>

          {g.escenas.map((s) => (
            <article key={s.numero} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-zinc-900 text-white">Escena {s.numero}</span>
                <span className="chip bg-zinc-100 text-zinc-700">{s.segundos}</span>
                <span className="chip bg-brand/10 text-brand">{s.tramo}</span>
              </div>
              <p className="mt-3 text-sm text-zinc-700"><strong>Se ve:</strong> {s.que_se_ve}</p>
              <p className="mt-1 text-sm text-zinc-700"><strong>Voz:</strong> “{s.voz}”</p>
              {s.texto_pantalla && <p className="mt-1 text-sm text-zinc-700"><strong>Texto en pantalla:</strong> {s.texto_pantalla}</p>}
              <div className="mt-3 rounded-xl bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-zinc-500">PROMPT PARA FLOW / VEO</p>
                  <CopyButton text={s.prompt_video} />
                </div>
                <p className="mt-1 text-[13px] whitespace-pre-wrap text-zinc-800">{s.prompt_video}</p>
              </div>
              {s.prompt_imagen && (
                <div className="mt-2 rounded-xl bg-zinc-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-500">PROMPT DE IMAGEN (PRIMER FOTOGRAMA)</p>
                    <CopyButton text={s.prompt_imagen} />
                  </div>
                  <p className="mt-1 text-[13px] whitespace-pre-wrap text-zinc-800">{s.prompt_imagen}</p>
                </div>
              )}
            </article>
          ))}

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Texto del anuncio</h2>
              <CopyButton text={g.texto_anuncio} />
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap text-zinc-700">{g.texto_anuncio}</p>
            <h3 className="mt-4 text-sm font-semibold">Títulos</h3>
            <ul className="mt-1 list-disc pl-5 text-sm text-zinc-700">
              {g.titulos.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">5 ganchos para probar</h2>
              <CopyButton text={r.variantes_gancho.join("\n")} />
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              {r.variantes_gancho.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Search className="size-4 text-brand" /> Por qué funciona el video</h2>
            <p className="mt-2 text-sm text-zinc-700">{a.resumen}</p>
            <p className="mt-3 text-xs font-semibold text-zinc-500">FORMATO · ÁNGULO</p>
            <p className="text-sm">{a.formato} · {a.angulo}</p>
            <p className="mt-3 text-xs font-semibold text-zinc-500">GANCHO</p>
            <p className="text-sm">{a.gancho.que_pasa}</p>
            {a.gancho.texto_pantalla && <p className="text-xs text-zinc-500">Texto: “{a.gancho.texto_pantalla}”</p>}
            <p className="mt-1 text-sm text-emerald-800">✔ {a.gancho.por_que_funciona}</p>
            <p className="mt-3 text-xs font-semibold text-zinc-500">ESTRUCTURA</p>
            <ol className="mt-1 space-y-2 text-sm">
              {a.estructura.map((e, i) => (
                <li key={i} className="rounded-lg bg-zinc-50 p-2">
                  <span className="font-semibold">{e.tramo}</span> <span className="text-xs text-zinc-500">({e.segundos})</span>
                  <p className="text-zinc-700">{e.que_pasa}</p>
                  <p className="text-xs text-zinc-500">Objetivo: {e.objetivo}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs font-semibold text-zinc-500">ELEMENTOS CLAVE</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-zinc-700">
              {a.elementos_clave.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold text-zinc-500">LLAMADO A LA ACCIÓN</p>
            <p className="text-sm">{a.llamado_accion}</p>
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-amber-500" /> Consejos para producirlo</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {r.consejos.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
          <p className="text-xs text-zinc-500">
            Los personajes creados con IA son presentadores: no los muestres como clientes reales y marca el contenido como hecho con IA cuando la plataforma lo pida.
          </p>
        </aside>
      </div>
    </>
  );
}
