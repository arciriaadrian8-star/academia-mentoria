import { getSettings, requireAdmin } from "@/lib/auth";
import { getAuthProviders } from "@/lib/authProviders";
import { getOrigin } from "@/lib/site";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { IMAGE_MODELS, landingAllowance, landingCostCop } from "@/lib/landing";
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
          <legend className="px-1 text-sm font-semibold">MakeDrop Landing (IA)</legend>
          <p className="text-xs text-zinc-500">
            Cada landing usa 3 fotos con IA: 2 con personas en el modelo que elijas y 1 del producto en el modelo económico. Tú y los coaches no tienen límite.
          </p>
          <div>
            <label className="label" htmlFor="landing_image_model">Modelo de las fotos con personas</label>
            <select id="landing_image_model" name="landing_image_model" defaultValue={settings.landing_image_model} className="input">
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} (~COP {m.costCop} por landing)</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="label">Límite de landings cada 30 días</span>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="landing_limit_mode" value="fijo" defaultChecked={settings.landing_limit_mode !== "porcentaje"} className="mt-0.5 accent-brand" />
              <span>
                <span className="font-medium">Número fijo por tipo de alumno</span>
                <span className="mt-2 grid gap-3 sm:grid-cols-2">
                  <span>
                    <span className="block text-xs text-zinc-500">Academia MakeDrop IA (rol «Solo Kit»)</span>
                    <input name="landing_monthly_kit" type="number" min={0} max={100} defaultValue={settings.landing_monthly_kit} className="input mt-1" aria-label="Landings al mes para la academia" />
                  </span>
                  <span>
                    <span className="block text-xs text-zinc-500">Mentoría 1 a 1 (rol «Miembro»)</span>
                    <input name="landing_monthly_member" type="number" min={0} max={500} defaultValue={settings.landing_monthly_member} className="input mt-1" aria-label="Landings al mes para la mentoría" />
                  </span>
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="landing_limit_mode" value="porcentaje" defaultChecked={settings.landing_limit_mode === "porcentaje"} className="mt-0.5 accent-brand" />
              <span>
                <span className="font-medium">Porcentaje de lo que paga cada alumno</span>
                <span className="block text-xs text-zinc-500">Pon cuánto paga cada uno en su ficha de Miembros; si no, se usa el pago por defecto.</span>
                <span className="mt-2 grid gap-3 sm:grid-cols-3">
                  <span>
                    <span className="block text-xs text-zinc-500">% del pago mensual</span>
                    <input name="landing_budget_pct" type="number" min={0} max={100} step="0.5" defaultValue={settings.landing_budget_pct} className="input mt-1" aria-label="Porcentaje del pago mensual" />
                  </span>
                  <span>
                    <span className="block text-xs text-zinc-500">Pago por defecto academia (USD)</span>
                    <input name="landing_default_usd_kit" type="number" min={0} step="0.01" defaultValue={settings.landing_default_usd_kit} className="input mt-1" aria-label="Pago por defecto academia" />
                  </span>
                  <span>
                    <span className="block text-xs text-zinc-500">Pago por defecto mentoría (USD)</span>
                    <input name="landing_default_usd_member" type="number" min={0} step="0.01" defaultValue={settings.landing_default_usd_member} className="input mt-1" aria-label="Pago por defecto mentoría" />
                  </span>
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            {settings.landing_limit_mode === "porcentaje" ? (
              <>
                <p className="font-semibold text-zinc-800">Con el {settings.landing_budget_pct} % guardado:</p>
                <ul className="mt-1 space-y-0.5">
                  {[12, 14, 19, 100, 500].map((usd) => {
                    const a = landingAllowance("kit", usd, { ...settings, landing_limit_mode: "porcentaje" });
                    return (
                      <li key={usd}>
                        Paga {usd} USD → <strong>{a.limit} landing{a.limit === 1 ? "" : "s"}</strong> cada 30 días
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p>
                <span className="font-semibold text-zinc-800">Gasto máximo por alumno al mes:</span> academia ~COP{" "}
                {(settings.landing_monthly_kit * landingCostCop(settings.landing_image_model)).toLocaleString("es-CO")} · mentoría ~COP{" "}
                {(settings.landing_monthly_member * landingCostCop(settings.landing_image_model)).toLocaleString("es-CO")}
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton pendingText="Guardando...">Guardar ajustes</SubmitButton>
        </div>
      </form>
    </div>
  );
}
