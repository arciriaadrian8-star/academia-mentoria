import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { RoadmapChecklist } from "./RoadmapChecklist";

export default async function RoadmapPage() {
  const { supabase, user } = await requireActive();
  const { data } = await supabase.from("roadmap_progress").select("task_key").eq("user_id", user.id);
  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader title="Ruta de 30 días" description="El paso a paso de cero a tu primera venta en contra entrega. Marca cada tarea cuando la termines." />
      <RoadmapChecklist done={(data ?? []).map((r) => r.task_key as string)} />
    </>
  );
}
