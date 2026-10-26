import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { AuthCard } from "../AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getSession();
  if (user) redirect("/");

  // Si todavía no existe ningún usuario, ir a la configuración inicial.
  if (hasAdminKey()) {
    const { count } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true });
    if (count === 0) redirect("/setup");
  }

  const { error } = await searchParams;
  const settings = await getSettings();
  return (
    <AuthCard settings={settings} title="Inicia sesión" subtitle={settings.tagline ?? undefined}>
      <LoginForm notice={error === "link" ? "El enlace ha caducado o no es válido. Pide uno nuevo." : undefined} />
    </AuthCard>
  );
}
