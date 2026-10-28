import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { Platform } from "@/lib/types";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { deletePlatform, updatePlatform } from "../../actions";
import { PlatformForm } from "../../PlatformForm";

export default async function EditPlatformPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("platforms").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const platform = data as Platform;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/plataformas" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Plataformas
      </Link>
      <PageHeader title={`Editar ${platform.name}`}>
        <form action={deletePlatform}>
          <input type="hidden" name="id" value={platform.id} />
          <ConfirmButton message={`¿Quitar ${platform.name} del directorio?`}>
            <Trash2 className="size-4" /> Quitar
          </ConfirmButton>
        </form>
      </PageHeader>
      <PlatformForm action={updatePlatform} platform={platform} />
    </div>
  );
}
