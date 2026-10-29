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
      <PromptGenerator />
    </>
  );
}
