"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizeCode, redeemErrorMessage } from "@/lib/accessCodes";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export type RedeemState = { error?: string } | null;

const NO_KEY = "La activación con código no está disponible ahora mismo. Escríbele a tu mentor.";

/** Comprueba que el código existe y no se ha usado (antes de crear la cuenta). */
async function checkCode(code: string) {
  const { data } = await createAdminClient().from("access_codes").select("used_at").eq("code", code).maybeSingle();
  if (!data) return redeemErrorMessage("codigo_invalido");
  if (data.used_at) return redeemErrorMessage("codigo_usado");
  return null;
}

async function redeem(code: string, userId: string) {
  const { error } = await createAdminClient().rpc("redeem_access_code", { p_code: code, p_user: userId });
  return error ? redeemErrorMessage(error.message) : null;
}

/**
 * Página pública /kit-acceso: crea la cuenta «Solo Kit» con el código.
 * Si el email ya tiene cuenta y la contraseña es correcta, el código renueva su acceso.
 */
export async function activateKit(_prev: RedeemState, formData: FormData): Promise<RedeemState> {
  if (!hasAdminKey()) return { error: NO_KEY };
  const code = normalizeCode(str(formData, "code"));
  const fullName = str(formData, "full_name").slice(0, 120);
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!code) return { error: "El código tiene este formato: KIT-XXXX-XXXX-XXXX." };
  if (!fullName || !email) return { error: "Escribe tu nombre y tu email." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const codeError = await checkCode(code);
  if (codeError) return { error: codeError };

  const admin = createAdminClient();
  const supabase = await createClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    const exists = error?.code === "email_exists" || error?.message.toLowerCase().includes("already");
    if (!exists) return { error: `No se pudo crear la cuenta: ${error?.message ?? "error desconocido"}` };
    // Ya tiene cuenta: si la contraseña es correcta, el código renueva su acceso.
    const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signIn.user) {
      return { error: "Ya existe una cuenta con ese email. Escribe tu contraseña de siempre para renovar, o usa otro email." };
    }
    const renewError = await redeem(code, signIn.user.id);
    if (renewError) return { error: renewError };
    revalidatePath("/", "layout");
    redirect("/kit?renovado=1");
  }

  const redeemError = await redeem(code, data.user.id);
  if (redeemError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: redeemError };
  }
  await admin.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/login");
  revalidatePath("/", "layout");
  redirect("/kit?bienvenido=1");
}

/** Usuario con sesión que mete un código nuevo para renovar su acceso al Kit. */
export async function renewKit(_prev: RedeemState, formData: FormData): Promise<RedeemState> {
  const { user } = await getSession();
  if (!user) redirect("/login");
  if (!hasAdminKey()) return { error: NO_KEY };
  const code = normalizeCode(str(formData, "code"));
  if (!code) return { error: "El código tiene este formato: KIT-XXXX-XXXX-XXXX." };
  const error = await redeem(code, user.id);
  if (error) return { error };
  revalidatePath("/", "layout");
  redirect("/kit?renovado=1");
}
