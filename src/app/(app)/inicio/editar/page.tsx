import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { updateOnboarding } from "../actions";

export default async function EditOnboardingPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("onboarding").select("video_url, content").eq("id", 1).maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/inicio" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Inicio
      </Link>
      <PageHeader
        title="Inducción para nuevos alumnos"
        description="Lo primero que ve cada alumno al entrar: tu vídeo de bienvenida y toda la información de la mentoría."
      />
      <form action={updateOnboarding} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="video_url">Vídeo de inducción</label>
          <input
            id="video_url"
            name="video_url"
            type="url"
            defaultValue={data?.video_url ?? ""}
            className="input"
            placeholder="https://youtu.be/... · vimeo.com/... · drive.google.com/..."
          />
          <p className="hint">Pega el enlace de YouTube (oculto), Vimeo, Loom o Google Drive.</p>
        </div>
        <div>
          <label className="label" htmlFor="content">Información de la mentoría</label>
          <MarkdownEditor
            id="content"
            name="content"
            folder="onboarding"
            rows={14}
            defaultValue={data?.content ?? ""}
            placeholder={"## Cómo funciona la mentoría\n- Sesiones en vivo cada martes...\n- Soporte por WhatsApp...\n\n## Tus primeros pasos\n1. ..."}
          />
          <p className="hint">Usa ## para títulos y - para listas. Puedes pegar imágenes.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/inicio" className="btn btn-secondary">Cancelar</Link>
          <SubmitButton pendingText="Guardando...">Guardar inducción</SubmitButton>
        </div>
      </form>
    </div>
  );
}
