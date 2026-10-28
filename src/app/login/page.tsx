import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { getAuthProviders } from "@/lib/authProviders";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { AuthCard } from "../AuthCard";
import { GoogleButton, OrDivider } from "../GoogleButton";
import { LoginForm } from "./LoginForm";

const NOTICES: Record<string, string> = {
  link: "El enlace ha caducado o ya se usó. Si querías cambiar tu contraseña, pulsa «¿Olvidaste tu contraseña?» y pide uno nuevo.",
  oauth: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getSession();
  if (user) redirect("/");

  // Si todavía no existe ningún usuario, ir a la configuración inicial.
  if (hasAdminKey()) {
    const { count } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true });
    if (count === 0) redirect("/setup");
  }

  const { error } = await searchParams;
  const [settings, providers] = await Promise.all([getSettings(), getAuthProviders()]);
  const canSignUp = settings.allow_signup && !providers.signupDisabled;

  return (
    <AuthCard settings={settings} title="Inicia sesión" subtitle={settings.tagline ?? undefined}>
      {providers.google && (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      )}
      <LoginForm notice={error ? NOTICES[error] : undefined} />
      {canSignUp && (
        <p className="mt-5 text-center text-sm text-zinc-500">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-brand hover:underline">
            Regístrate
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
