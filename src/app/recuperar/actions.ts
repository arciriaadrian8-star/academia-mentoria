"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export async function requestReset(_prev: { sent?: boolean; error?: string } | null, formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  if (!email) return { error: "Escribe tu email." };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/nueva-contrasena`,
  });
  // Por seguridad no decimos si el email existe o no.
  return { sent: true };
}
