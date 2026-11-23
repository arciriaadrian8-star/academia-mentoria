"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSettings, requireKit } from "@/lib/auth";
import { COUNTRIES } from "@/lib/kit";
import { AUDIENCES, isHexColor, LANDING_BUCKET, landingLimit } from "@/lib/landing";
import { str, strOrNull } from "@/lib/utils";

export type LandingState = { error?: string } | null;

export async function createLanding(_prev: LandingState, formData: FormData): Promise<LandingState> {
  const { supabase, user, profile } = await requireKit();
  const description = str(formData, "description");
  // El nombre es opcional: si no lo escribe, usamos el comienzo de la descripción.
  const product = str(formData, "product") || description.split(/[.,\n]/)[0].slice(0, 60).trim();
  const price = str(formData, "price");
  const photos = formData.getAll("photo_paths").map(String).filter((p) => p.startsWith(`${user.id}/`)).slice(0, 3);
  const gif = str(formData, "gif_path");
  const cleanup = () => supabase.storage.from(LANDING_BUCKET).remove([...photos, ...(gif ? [gif] : [])]);

  if (description.length < 10) return { error: "Describe el producto: qué es, qué problema resuelve y qué lo hace especial." };
  if (product.length < 2) return { error: "Describe el producto un poco más." };
  if (!price) return { error: "Escribe el precio de venta." };
  if (photos.length === 0) return { error: "Sube al menos una foto del producto." };

  const limit = landingLimit(profile.role, await getSettings());
  if (limit !== null) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { count } = await supabase.from("ai_landings").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= limit) {
      await cleanup();
      return { error: limit === 0 ? "Tu plan no incluye landings con IA." : `Llegaste al límite de ${limit} landings en 30 días.` };
    }
  }

  const country = COUNTRIES.includes(str(formData, "country") as (typeof COUNTRIES)[number]) ? str(formData, "country") : "Colombia";
  const audience = AUDIENCES.includes(str(formData, "audience") as (typeof AUDIENCES)[number]) ? str(formData, "audience") : null;

  const { data, error } = await supabase
    .from("ai_landings")
    .insert({
      user_id: user.id,
      product: product.slice(0, 120),
      description: description.slice(0, 2000),
      country,
      price: price.slice(0, 40),
      compare_price: strOrNull(formData, "compare_price")?.slice(0, 40) ?? null,
      offer: strOrNull(formData, "offer")?.slice(0, 200) ?? null,
      audience,
      store_name: strOrNull(formData, "store_name")?.slice(0, 60) ?? null,
      color: isHexColor(str(formData, "color")) ? str(formData, "color").toUpperCase() : null,
      reviews: strOrNull(formData, "reviews")?.slice(0, 4000) ?? null,
      photo_paths: photos,
      gif_path: gif.startsWith(`${user.id}/`) ? gif : null,
    })
    .select("id")
    .single();
  if (error) {
    await cleanup();
    return { error: `No se pudo crear: ${error.message}` };
  }

  // La función responde de inmediato y sigue trabajando en segundo plano.
  await supabase.functions.invoke("makedrop-landing", { body: { id: data.id } });
  revalidatePath("/kit/landing");
  redirect(`/kit/landing/${data.id}`);
}

export async function deleteLanding(formData: FormData) {
  const { supabase, user } = await requireKit();
  const id = str(formData, "id");
  const { data: files } = await supabase.storage.from(LANDING_BUCKET).list(`${user.id}/${id}`, { limit: 100 });
  const { data: row } = await supabase.from("ai_landings").select("photo_paths, gif_path").eq("id", id).maybeSingle();
  const paths = [
    ...(files ?? []).map((f) => `${user.id}/${id}/${f.name}`),
    ...((row?.photo_paths as string[] | null) ?? []),
    ...(row?.gif_path ? [row.gif_path as string] : []),
  ];
  if (paths.length) await supabase.storage.from(LANDING_BUCKET).remove(paths);
  await supabase.from("ai_landings").delete().eq("id", id);
  revalidatePath("/kit/landing");
  redirect("/kit/landing");
}
