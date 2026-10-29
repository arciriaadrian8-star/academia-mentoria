import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ProductEvaluator } from "./ProductEvaluator";

export default async function ProductEvaluatorPage() {
  await requireActive();
  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title="Evaluador de producto ganador"
        description="12 preguntas antes de gastar un peso en publicidad. Basado en las 4 variables: gancho, dolor o deseo, margen y logística."
      />
      <ProductEvaluator />
    </>
  );
}
