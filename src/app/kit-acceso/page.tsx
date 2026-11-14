import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { normalizeCode } from "@/lib/accessCodes";
import { AuthCard } from "../AuthCard";
import { ActivateForm } from "./ActivateForm";
import { RenewForm } from "./RenewForm";

export default async function KitAccessPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const code = normalizeCode(codigo) ?? undefined;
  const [{ user, profile }, settings] = await Promise.all([getSession(), getSettings()]);

  if (user && profile) {
    // Los miembros de la academia ya tienen el Kit incluido.
    if (profile.role !== "kit") redirect("/kit");
    return (
      <AuthCard settings={settings} title="Renueva tu acceso" subtitle="Escribe tu código nuevo y se suman los días a tu cuenta.">
        <RenewForm code={code} />
        <Link href="/kit" className="btn btn-secondary mt-3 w-full">Ir al Kit COD</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      settings={settings}
      title="Activa tu Kit COD"
      subtitle="Escribe tu código de acceso y crea tu cuenta. El código sirve una sola vez."
    >
      <ActivateForm code={code} />
      <p className="mt-5 text-center text-sm text-zinc-500">
        ¿Ya activaste tu código?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}
