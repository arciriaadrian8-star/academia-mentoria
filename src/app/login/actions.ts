"use server";

import { redirect } from "next/navigation";
import { getRequestOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: str(formData, "email").toLowerCase(),
    password: str(formData, "password"),
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Aún no has confirmado tu email. Revisa tu bandeja de entrada (y el spam)." };
    }
    return { error: "Email o contraseña incorrectos." };
  }
  redirect("/");
}

export async function signInWithGoogle(_prev: { error?: string } | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getRequestOrigin()}/auth/confirm?next=/` },
  });
  if (error || !data.url) return { error: "No se pudo conectar con Google. Inténtalo de nuevo." };
  redirect(data.url);
}
