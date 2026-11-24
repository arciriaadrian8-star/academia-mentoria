import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getSettings, requireKit } from "@/lib/auth";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { getPointsBalance, LANDING_BUCKET, type LandingResult } from "@/lib/landing";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { deleteLanding } from "../actions";
import { AutoRefresh } from "./AutoRefresh";
import { LandingStudio, type StudioProps } from "./LandingStudio";

export default async function LandingResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireKit();
  const { data: row } = await supabase.from("ai_landings").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();

  const back = (
    <Link href="/kit/landing" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft className="size-4" /> Mis landings
    </Link>
  );

  const stale = row.status === "procesando" && Date.now() - new Date(row.created_at).getTime() > 8 * 60 * 1000;
  if (stale) {
    row.status = "error";
    row.error = "La IA tardó demasiado y se canceló. Intenta de nuevo en unos minutos.";
  }

  if (row.status === "procesando") {
    return (
      <>
        {back}
        <PageHeader title={row.product} description="Creando tu landing completa para Shopify" />
        <AutoRefresh since={row.created_at} />
      </>
    );
  }

  const actions = (
    <form action={deleteLanding}>
      <input type="hidden" name="id" value={row.id} />
      <ConfirmButton message="¿Borrar esta landing y sus imágenes?" className="btn-secondary btn-sm">
        <Trash2 className="size-3.5" /> Borrar
      </ConfirmButton>
    </form>
  );

  if (row.status === "error" || !row.result?.titulo) {
    return (
      <>
        {back}
        <PageHeader title={row.product}>{actions}</PageHeader>
        <div className="card border-l-4 border-l-red-400 p-5">
          <p className="font-semibold">No se pudo crear la landing</p>
          <p className="mt-1 text-sm text-zinc-600">{row.error || "Error desconocido."}</p>
          <Link href="/kit/landing" className="btn btn-primary mt-4">Intentar de nuevo</Link>
        </div>
      </>
    );
  }

  // Enlaces temporales (1 hora) para ver y dibujar las imágenes en el navegador.
  const images = (row.images ?? {}) as Record<string, string>;
  const photoPaths = (row.photo_paths ?? []) as string[];
  const paths = [...Object.values(images), ...photoPaths, ...(row.gif_path ? [row.gif_path as string] : [])];
  const { data: signed } = paths.length ? await supabase.storage.from(LANDING_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const urlOf = (path: string) => signed?.find((s) => s.path === path)?.signedUrl ?? "";

  // Escena de entrega compartida (imagen «Confianza»): está fuera de la carpeta del alumno, la firma el servidor.
  const [settings, points] = await Promise.all([getSettings(), getPointsBalance(supabase, row.user_id)]);
  const delivery = hasAdminKey() ? await createAdminClient().storage.from(LANDING_BUCKET).createSignedUrl("_shared/entrega.png", 3600) : null;

  const studio: StudioProps = {
    landingId: row.id,
    userId: row.user_id,
    code: row.code,
    result: row.result as LandingResult,
    price: row.price,
    comparePrice: row.compare_price,
    offer: row.offer,
    storeName: row.store_name,
    color: row.color ?? null,
    aiUrls: Object.fromEntries(Object.entries(images).map(([slot, path]) => [slot, urlOf(path)]).filter(([, u]) => u)),
    photoUrls: photoPaths.map(urlOf).filter(Boolean),
    gifUrl: row.gif_path ? urlOf(row.gif_path) || null : null,
    deliveryUrl: delivery?.data?.signedUrl ?? null,
    reviews: row.reviews ?? null,
    redoCost: settings.points_redo,
    pointsBalance: points.balance,
  };

  return (
    <>
      {back}
      <PageHeader title={(row.result as LandingResult).nombre_marca || row.product} description={row.product}>
        {actions}
      </PageHeader>
      <LandingStudio {...studio} />
    </>
  );
}
