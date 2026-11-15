"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { INTERVALS } from "@/lib/membership";
import { str, strOrNull } from "@/lib/utils";

export async function createPlan(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(formData, "name").slice(0, 80);
  const price = parseInt(str(formData, "price_cop").replace(/\D/g, ""), 10);
  const days = parseInt(str(formData, "interval_days"), 10);
  const role = str(formData, "grants_role") === "member" ? "member" : "kit";
  if (name.length < 2 || !Number.isFinite(price) || price < 1500) {
    redirect("/miembros/membresias?error=Escribe un nombre y un precio de al menos $1.500");
  }
  const { error } = await supabase.from("membership_plans").insert({
    name,
    description: strOrNull(formData, "description")?.slice(0, 500) ?? null,
    price_cop: price,
    interval_days: INTERVALS.some((i) => i.days === days) ? days : 30,
    grants_role: role,
  });
  if (error) redirect(`/miembros/membresias?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/miembros/membresias");
  revalidatePath("/membresia");
  redirect("/miembros/membresias?ok=1");
}

export async function togglePlan(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("membership_plans").update({ active: str(formData, "active") === "true" }).eq("id", str(formData, "id"));
  revalidatePath("/miembros/membresias");
  revalidatePath("/membresia");
}

export async function cancelSubscription(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("cancel_subscription", { p_id: str(formData, "id") });
  revalidatePath("/miembros/membresias");
}
