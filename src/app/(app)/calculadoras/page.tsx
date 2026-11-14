import { requireKit } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Calculators } from "./Calculators";

export default async function ToolsPage() {
  await requireKit();
  return (
    <>
      <PageHeader
        title="Calculadoras"
        description="Calculadoras para saber si tu producto es rentable, a qué precio venderlo y qué hacer con tus campañas."
      />
      <Calculators />
    </>
  );
}
