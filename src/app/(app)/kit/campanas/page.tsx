import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CampaignAnalyzer } from "./CampaignAnalyzer";

export default async function CampaignsPage() {
  await requireActive();
  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title="Analizador de campañas"
        description="Pega los números de tu campaña y te digo si escalar, optimizar o apagar, dónde se rompe el embudo y qué hacer paso a paso."
      />
      <CampaignAnalyzer />
    </>
  );
}
