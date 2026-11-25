import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, getSettings } from "@/lib/auth";
import { MakeDropHome } from "./MakeDropHome";

export const metadata: Metadata = {
  title: "MakeDrop IA | Tu landing ganadora para Shopify con IA",
  description:
    "Sube la foto de tu producto y tu oferta: MakeDrop IA te arma título, descripción, preguntas frecuentes e imágenes vendedoras listas para Shopify. Hecho para contra entrega en Latinoamérica.",
};

/** Portada: quien ya inició sesión entra a la academia; los visitantes ven la página de MakeDrop IA. */
export default async function Home() {
  const [{ user }, settings] = await Promise.all([getSession(), getSettings()]);
  if (user) redirect("/inicio");
  return <MakeDropHome logo={settings.logo_url} />;
}
