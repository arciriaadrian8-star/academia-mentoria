"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireAdmin } from "@/lib/auth";
import { safeUrl, str, strOrNull } from "@/lib/utils";

export async function claimBenefit(formData: FormData) {
  const { supabase } = await requireActive();
  const id = str(formData, "id");
  const { error } = await supabase.rpc("claim_benefit", { bid: id });
  revalidatePath("/beneficios");
  revalidatePath("/inicio");
  if (error) redirect(`/beneficios?error=${encodeURIComponent(error.message)}#b-${id}`);
  redirect(`/beneficios?reclamado=${id}#b-${id}`);
}

function payload(formData: FormData) {
  return {
    title: str(formData, "title"),
    description: strOrNull(formData, "description"),
    image_url: safeUrl(strOrNull(formData, "image_url")),
    claim_url: safeUrl(strOrNull(formData, "claim_url")),
    delivery: str(formData, "delivery") === "code" ? "code" : "link",
    active: formData.get("active") === "on",
    position: parseInt(str(formData, "position"), 10) || 0,
  };
}

/** Pega códigos (uno por línea); los repetidos se ignoran. */
async function addCodes(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], benefitId: string, raw: string) {
  const codes = [...new Set(raw.split(/[\r\n,;]+/).map((c) => c.trim()).filter(Boolean))].slice(0, 5000);
  if (codes.length === 0) return;
  const { error } = await supabase
    .from("benefit_codes")
    .upsert(codes.map((code) => ({ benefit_id: benefitId, code })), { onConflict: "benefit_id,code", ignoreDuplicates: true });
  if (error) throw error;
}

export async function createBenefit(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("benefits").insert(payload(formData)).select("id").single();
  if (error) throw error;
  await addCodes(supabase, data.id, str(formData, "codes"));
  revalidatePath("/beneficios");
  redirect(`/beneficios/${data.id}/editar?guardado=1`);
}

export async function updateBenefit(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const { error } = await supabase.from("benefits").update(payload(formData)).eq("id", id);
  if (error) throw error;
  await addCodes(supabase, id, str(formData, "codes"));
  revalidatePath("/beneficios");
  redirect(`/beneficios/${id}/editar?guardado=1`);
}

export async function deleteBenefit(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("benefits").delete().eq("id", str(formData, "id"));
  revalidatePath("/beneficios");
  redirect("/beneficios");
}

export async function deleteFreeCodes(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  await supabase.from("benefit_codes").delete().eq("benefit_id", id).is("assigned_to", null);
  revalidatePath("/beneficios");
  redirect(`/beneficios/${id}/editar`);
}
