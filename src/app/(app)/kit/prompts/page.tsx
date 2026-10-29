import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { PromptGenerator } from "./PromptGenerator";

export default async function PromptsPage() {
  await requireActive();
  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title="Generador de prompts y guiones"
        description="Cambia el producto y el ángulo: te armo ganchos, textos, imágenes, página de producto y guiones de video con IA (UGC, esqueleto, historia animada y más)."
      />
      <Link href="/kit/video-ia" className="card mb-6 flex items-center gap-3 border-brand/30 bg-brand/5 p-4 text-sm transition hover:shadow-md">
        <span className="text-xl">🪄</span>
        <span>
          <strong>¿Tienes un video ganador de referencia?</strong> Súbelo a <span className="font-semibold text-brand">Guion IA</span> y la IA te escribe un guion a la medida de tu producto.
        </span>
      </Link>
      <PromptGenerator />
    </>
  );
}
