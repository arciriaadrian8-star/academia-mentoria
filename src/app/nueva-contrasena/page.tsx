import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { AuthCard } from "../AuthCard";
import { NewPasswordForm } from "./NewPasswordForm";

export default async function NewPasswordPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?error=link");
  const settings = await getSettings();
  return (
    <AuthCard settings={settings} title="Nueva contraseña" subtitle="Elige una contraseña de al menos 8 caracteres.">
      <NewPasswordForm />
    </AuthCard>
  );
}
