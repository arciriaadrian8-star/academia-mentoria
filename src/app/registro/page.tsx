import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { getAuthProviders } from "@/lib/authProviders";
import { AuthCard } from "../AuthCard";
import { GoogleButton, OrDivider } from "../GoogleButton";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const { user } = await getSession();
  if (user) redirect("/");
  const [settings, providers] = await Promise.all([getSettings(), getAuthProviders()]);

  if (!settings.allow_signup || providers.signupDisabled) {
    return (
      <AuthCard settings={settings} title="Registro cerrado">
        <p className="text-center text-sm text-zinc-600">Ahora mismo no se aceptan registros. Pide acceso a tu mentor.</p>
        <Link href="/login" className="btn btn-secondary mt-6 w-full">Ir al login</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      settings={settings}
      title="Crea tu cuenta"
      subtitle={settings.auto_approve ? undefined : "Tu mentor revisará tu solicitud y te dará acceso."}
    >
      {providers.google && (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      )}
      <RegisterForm />
      <p className="mt-5 text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}
