import { getSettings } from "@/lib/auth";
import { AuthCard } from "../AuthCard";
import { ResetForm } from "./ResetForm";

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, settings] = await Promise.all([searchParams, getSettings()]);
  return (
    <AuthCard settings={settings} title="Recuperar contraseña" subtitle="Te enviaremos un enlace a tu email.">
      <ResetForm
        notice={
          error === "enlace"
            ? "Ese enlace ya se usó o caducó. Pide uno nuevo aquí abajo: llega en 1 minuto y es válido durante 1 hora."
            : undefined
        }
      />
    </AuthCard>
  );
}
