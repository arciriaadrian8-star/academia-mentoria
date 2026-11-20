import Link from "next/link";
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
        Venció el {formatAccessDate(profile.access_until!)}. Renueva tu membresía o escribe un código nuevo para seguir usando las herramientas. Tu
        historial de guiones se mantiene.
      </p>
      <Link href="/membresia" className="btn btn-primary mb-4 w-full">Renovar mi membresía</Link>
      <p className="mb-3 text-center text-xs text-zinc-500">¿Tienes un código? Escríbelo aquí:</p>
      <RenewForm />
      <form action={signOut} className="mt-3">
        <button className="btn btn-secondary w-full">Cerrar sesión</button>
      </form>
    </AuthCard>
  );
}
