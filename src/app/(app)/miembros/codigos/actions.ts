"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { CODE_ALPHABET, CODE_DURATIONS } from "@/lib/accessCodes";
import { str, strOrNull } from "@/lib/utils";

function newCode() {
  const chars = Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `KIT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

export async function generateCodes(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const quantity = Math.min(Math.max(parseInt(str(formData, "quantity"), 10) || 1, 1), 50);
  const days = parseInt(str(formData, "days"), 10);
  const validDays = CODE_DURATIONS.some((d) => d.days === days) ? days : 30;
  const note = strOrNull(formData, "note")?.slice(0, 200) ?? null;
  const rows = Array.from({ length: quantity }, () => ({ code: newCode(), days: validDays || null, note, created_by: user.id }));
  const { error } = await supabase.from("access_codes").insert(rows);
  if (error) throw error;
  revalidatePath("/miembros/codigos");
  redirect(`/miembros/codigos?nuevos=${quantity}`);
}

export async function deleteCode(formData: FormData) {
  const { supabase } = await requireAdmin();
  // Solo se borran los que nadie ha usado (los usados quedan como historial).
  await supabase.from("access_codes").delete().eq("code", str(formData, "code")).is("used_at", null);
  revalidatePath("/miembros/codigos");
}
