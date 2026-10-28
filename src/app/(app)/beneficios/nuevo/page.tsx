import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { createBenefit } from "../actions";
import { BenefitForm } from "../BenefitForm";

export default async function NewBenefitPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/beneficios" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Beneficios
      </Link>
      <PageHeader title="Nuevo beneficio" />
      <BenefitForm action={createBenefit} />
    </div>
  );
}
