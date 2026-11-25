"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSettings, requireKit } from "@/lib/auth";
import { COUNTRIES } from "@/lib/kit";
import { AUDIENCES, getPointsBalance, isHexColor, isLandingMode, LANDING_BUCKET } from "@/lib/landing";
import { str, strOrNull } from "@/lib/utils";

export type LandingState = { error?: string } | null;

export async function createLanding(_prev: LandingState, formData: FormData): Promise<LandingState> {
  const { supabase, user } = await requireKit();
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

  // Puntos de IA: la landing completa (con fotos IA) cuesta points_landing; los demás formatos, points_landing_text.
  const mode = isLandingMode(str(formData, "mode")) ? str(formData, "mode") : "completa";
  const [settings, points] = await Promise.all([getSettings(), getPointsBalance(supabase, user.id)]);
  const cost = mode === "completa" ? settings.points_landing : settings.points_landing_text;
  if (points.balance !== null && points.balance < cost) {
    await cleanup();
    return { error: `No te alcanzan los puntos: este formato cuesta ${cost} y te quedan ${points.balance}. Se recargan el 1 del próximo mes.` };
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
      mode,
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
