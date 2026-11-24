import { getSettings, requireAdmin } from "@/lib/auth";
import { getAuthProviders } from "@/lib/authProviders";
import { getOrigin } from "@/lib/site";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { IMAGE_MODELS, landingCostCop } from "@/lib/landing";
import { updateSettings } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { guardado } = await searchParams;
  await requireAdmin();
  const [settings, providers, origin] = await Promise.all([getSettings(), getAuthProviders(), getOrigin()]);
  const signupUrl = `${origin}/registro`;

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
        <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold">Registro de alumnos</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="allow_signup" defaultChecked={settings.allow_signup} className="mt-0.5 accent-brand" />
            <span>
              <span className="font-medium">Permitir que se registren solos</span>
              <span className="block text-xs text-zinc-500">
                Muestra «Regístrate» en el login. Pueden usar email y contraseña{providers.google ? " o Google" : ""}.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="auto_approve" defaultChecked={settings.auto_approve} className="mt-0.5 accent-brand" />
            <span>
              <span className="font-medium">Dar acceso automáticamente al registrarse</span>
              <span className="block text-xs text-zinc-500">
                Si lo dejas desmarcado, cada registro te llega a Miembros → Solicitudes y tú decides a quién das acceso.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 p-3 text-sm">
            <span className="text-zinc-500">Enlace de registro:</span>
            <code className="min-w-0 flex-1 truncate">{signupUrl}</code>
            <CopyButton text={signupUrl} />
          </div>
          {!providers.google && (
            <p className="text-xs text-zinc-500">
              El acceso con Google aún no está activado. Sigue la guía del README («Activar acceso con Google»).
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold">Puntos de IA (MakeDrop Landing)</legend>
          <p className="text-xs text-zinc-500">
            Cada alumno tiene una bolsa de puntos al mes que se recarga el día 1. Cada acción con IA descuenta puntos. Puedes darle a cada alumno sus propios puntos desde su ficha en Miembros. Tú y los coaches no gastan puntos.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="points_monthly_kit">Puntos al mes · Academia</label>
              <input id="points_monthly_kit" name="points_monthly_kit" type="number" min={0} defaultValue={settings.points_monthly_kit} className="input" />
              <p className="hint">Alumnos «Solo Kit» (membresía).</p>
            </div>
            <div>
              <label className="label" htmlFor="points_monthly_member">Puntos al mes · Mentoría 1 a 1</label>
              <input id="points_monthly_member" name="points_monthly_member" type="number" min={0} defaultValue={settings.points_monthly_member} className="input" />
              <p className="hint">Miembros con acceso completo.</p>
            </div>
            <div>
              <label className="label" htmlFor="points_landing">Crear una landing cuesta</label>
              <input id="points_landing" name="points_landing" type="number" min={0} defaultValue={settings.points_landing} className="input" />
              <p className="hint">Gasto real en Gemini: ~COP {landingCostCop(settings.landing_image_model)}.</p>
            </div>
            <div>
              <label className="label" htmlFor="points_redo">Rehacer una foto cuesta</label>
              <input id="points_redo" name="points_redo" type="number" min={0} defaultValue={settings.points_redo} className="input" />
              <p className="hint">Gasto real en Gemini: ~COP 125 a 213.</p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="landing_image_model">Modelo de las fotos con personas</label>
            <select id="landing_image_model" name="landing_image_model" defaultValue={settings.landing_image_model} className="input">
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} (~COP {m.costCop} por landing)</option>
              ))}
            </select>
          </div>
          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            Con {settings.points_monthly_kit} puntos un alumno de la academia puede crear{" "}
            <strong>{settings.points_landing ? Math.floor(settings.points_monthly_kit / settings.points_landing) : "∞"} landings</strong> al mes
            {settings.points_redo && settings.points_landing
              ? ` y le sobran ${settings.points_monthly_kit % settings.points_landing} puntos (${Math.floor((settings.points_monthly_kit % settings.points_landing) / settings.points_redo)} fotos para rehacer)`
              : ""}
            .
          </p>
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton pendingText="Guardando...">Guardar ajustes</SubmitButton>
        </div>
      </form>
    </div>
  );
}
