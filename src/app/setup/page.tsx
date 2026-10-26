import { redirect } from "next/navigation";
import { getSettings } from "@/lib/auth";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { AuthCard } from "../AuthCard";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const settings = await getSettings();

  if (!hasAdminKey()) {
    return (
      <AuthCard settings={settings} title="Configuración inicial">
        <p className="text-sm text-zinc-600">
          Falta la variable <code className="rounded bg-zinc-100 px-1">SUPABASE_SECRET_KEY</code>. Añádela y vuelve a desplegar.
        </p>
      </AuthCard>
    );
  }

  const { count, error } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true });
  if (error) {
    return (
      <AuthCard settings={settings} title="Configuración inicial">
        <p className="text-sm text-zinc-600">
          No se encontró la base de datos. Ejecuta el archivo <code className="rounded bg-zinc-100 px-1">supabase/schema.sql</code> en
          el SQL Editor de Supabase y recarga esta página.
        </p>
      </AuthCard>
    );
  }
  if (count !== 0) redirect("/login");

  return (
    <AuthCard settings={settings} title="¡Bienvenido/a! 👋" subtitle="Crea tu cuenta de administrador. Solo se hace una vez.">
      <SetupForm />
    </AuthCard>
  );
}
