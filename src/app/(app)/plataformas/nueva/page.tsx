import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { createPlatform } from "../actions";
import { PlatformForm } from "../PlatformForm";

export default async function NewPlatformPage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/plataformas" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Plataformas
      </Link>
      <PageHeader title="Añadir plataforma" />
      <PlatformForm action={createPlatform} />
    </div>
  );
}
