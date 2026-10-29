import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { WhatsAppTemplates } from "./WhatsAppTemplates";

export default async function WhatsAppPage() {
  await requireActive();
  return (
    <>
      <Link href="/kit" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Kit COD
      </Link>
      <PageHeader
        title="Mensajes de WhatsApp"
        description="Los mensajes de cada etapa del pedido contra entrega, listos para copiar o abrir el chat del cliente con un clic."
      />
      <WhatsAppTemplates />
    </>
  );
}
