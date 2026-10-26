"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { passwordErrorMessage, str } from "@/lib/utils";

export async function setNewPassword(_prev: { error?: string } | null, formData: FormData) {
  const password = str(formData, "password");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== str(formData, "confirm")) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: passwordErrorMessage(error) };
  redirect("/");
}
