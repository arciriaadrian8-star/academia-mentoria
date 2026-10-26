"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: str(formData, "email").toLowerCase(),
    password: str(formData, "password"),
  });
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }
  redirect("/");
}
