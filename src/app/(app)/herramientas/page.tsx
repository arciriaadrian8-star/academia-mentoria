import { requireActive } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Calculators } from "./Calculators";

export default async function ToolsPage() {
  await requireActive();
  return (
    <>
      <PageHeader
        title="Herramientas"
        description="Calculadoras para saber si tu producto es rentable, a qué precio venderlo y qué hacer con tus campañas."
      />
      <Calculators />
    </>
  );
}
