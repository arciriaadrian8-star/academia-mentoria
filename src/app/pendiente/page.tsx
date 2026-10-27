import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { signOut } from "../actions";
import { AuthCard } from "../AuthCard";

export default async function PendingPage() {
  const { profile } = await getSession();
  if (!profile) redirect("/login");
  if (profile.active) redirect("/");
  const settings = await getSettings();
  return (
    <AuthCard settings={settings} title={profile.pending ? "¡Solicitud recibida! 🙌" : "Cuenta sin acceso"}>
      <p className="text-center text-sm text-zinc-600">
        {profile.pending
          ? "Tu cuenta está pendiente de aprobación. En cuanto tu mentor te dé acceso, podrás entrar con tu email o con Google."
          : "Tu cuenta ha sido desactivada. Contacta con tu mentor para recuperar el acceso."}
      </p>
      <form action={signOut} className="mt-6">
        <button className="btn btn-secondary w-full">Cerrar sesión</button>
      </form>
    </AuthCard>
  );
}
