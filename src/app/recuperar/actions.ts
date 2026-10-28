"use server";

import { getRequestOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export async function requestReset(_prev: { sent?: boolean; error?: string } | null, formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  if (!email) return { error: "Escribe tu email." };

  const origin = await getRequestOrigin();

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/nueva-contrasena`,
  });
  // Por seguridad no decimos si el email existe o no.
  return { sent: true };
}
