import { redirect } from "next/navigation";
import { getSession, getSettings, isKitExpired } from "@/lib/auth";
import { formatAccessDate } from "@/lib/accessCodes";
import { signOut } from "../actions";
import { AuthCard } from "../AuthCard";
import { RenewForm } from "../kit-acceso/RenewForm";

export default async function ExpiredPage() {
  const { profile } = await getSession();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/pendiente");
  if (!isKitExpired(profile)) redirect("/");
  const settings = await getSettings();
  return (
    <AuthCard settings={settings} title="Tu acceso al Kit COD venció">
      <p className="mb-5 text-center text-sm text-zinc-600">
        Venció el {formatAccessDate(profile.access_until!)}. Escribe un código nuevo para seguir usando las herramientas. Tu
        historial de guiones se mantiene.
      </p>
      <RenewForm />
      <form action={signOut} className="mt-3">
        <button className="btn btn-secondary w-full">Cerrar sesión</button>
      </form>
    </AuthCard>
  );
}
