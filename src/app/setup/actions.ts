"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export async function createFirstAdmin(_prev: { error?: string } | null, formData: FormData) {
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if (count !== 0) redirect("/login");

  const fullName = str(formData, "full_name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!fullName || !email) return { error: "Completa tu nombre y email." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: `No se pudo crear la cuenta: ${error.message}` };

  const academyName = str(formData, "academy_name");
  if (academyName) await admin.from("settings").update({ academy_name: academyName }).eq("id", 1);

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/classroom");
}
