"use server";

import { redirect } from "next/navigation";
import { getSettings } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export async function register(
  _prev: { error?: string; checkEmail?: string } | null,
  formData: FormData,
): Promise<{ error?: string; checkEmail?: string }> {
  const fullName = str(formData, "full_name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!fullName || !email) return { error: "Escribe tu nombre y tu email." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== str(formData, "confirm")) return { error: "Las contraseñas no coinciden." };

  const settings = await getSettings();
  if (!settings.allow_signup) return { error: "El registro está cerrado. Pide acceso a tu mentor." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await getRequestOrigin()}/auth/confirm?next=/`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") return { error: "Ya existe una cuenta con ese email. Inicia sesión." };
    if (error.code === "signup_disabled") return { error: "El registro está cerrado. Pide acceso a tu mentor." };
    if (error.code === "weak_password") return { error: "La contraseña es demasiado débil. Usa letras y números." };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Se han enviado demasiados emails. Inténtalo de nuevo en unos minutos." };
    }
    return { error: `No se pudo crear la cuenta: ${error.message}` };
  }

  // Sin confirmación de email: ya tiene sesión. Con confirmación: debe abrir el enlace del email.
  if (data.session) redirect("/");
  return { checkEmail: email };
}
