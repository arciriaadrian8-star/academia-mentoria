import { getSettings, requireAdmin } from "@/lib/auth";
import { FormMessage } from "@/components/FormMessage";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { updateSettings } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { guardado } = await searchParams;
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ajustes de la academia" description="Personaliza el nombre, el logo y los colores." />
      <form action={updateSettings} className="card space-y-5 p-6">
        {guardado && <FormMessage success="Ajustes guardados." />}
        <div>
          <label className="label" htmlFor="academy_name">Nombre de la academia</label>
          <input id="academy_name" name="academy_name" required defaultValue={settings.academy_name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tagline">Subtítulo</label>
          <input id="tagline" name="tagline" defaultValue={settings.tagline ?? ""} className="input" placeholder="Ej: Mentoría 1 a 1 para emprendedores" />
        </div>
        <div>
          <span className="label">Logo (cuadrado)</span>
          <ImageUpload name="logo_url" folder="branding" defaultUrl={settings.logo_url} shape="square" />
        </div>
        <div>
          <label className="label" htmlFor="primary_color">Color principal</label>
          <input
            id="primary_color"
            name="primary_color"
            type="color"
            defaultValue={settings.primary_color}
            className="h-10 w-20 cursor-pointer rounded-lg border border-zinc-200 p-1"
          />
        </div>
        <div>
          <label className="label" htmlFor="welcome_message">Mensaje de bienvenida</label>
          <textarea id="welcome_message" name="welcome_message" rows={4} defaultValue={settings.welcome_message ?? ""} className="input" />
          <p className="hint">Se muestra en la barra lateral de la Comunidad.</p>
        </div>
        <div className="flex justify-end">
          <SubmitButton pendingText="Guardando...">Guardar ajustes</SubmitButton>
        </div>
      </form>
    </div>
  );
}
