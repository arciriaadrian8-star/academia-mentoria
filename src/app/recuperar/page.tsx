import { getSettings } from "@/lib/auth";
import { AuthCard } from "../AuthCard";
import { ResetForm } from "./ResetForm";

export default async function RecoverPage() {
  const settings = await getSettings();
  return (
    <AuthCard settings={settings} title="Recuperar contraseña" subtitle="Te enviaremos un enlace a tu email.">
      <ResetForm />
    </AuthCard>
  );
}
