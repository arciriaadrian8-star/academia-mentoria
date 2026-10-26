import Link from "next/link";
import { Plus } from "lucide-react";
import { requireActive } from "@/lib/auth";
import { getEvents } from "@/lib/events";
import { PageHeader } from "@/components/PageHeader";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const { supabase, isStaff } = await requireActive();
  const events = await getEvents(supabase, isStaff);

  return (
    <>
      <PageHeader title="Calendario" description="Sesiones en directo, llamadas de grupo y tus sesiones 1 a 1.">
        {isStaff && (
          <Link href="/calendario/nuevo" className="btn btn-primary">
            <Plus className="size-4" /> Nuevo evento
          </Link>
        )}
      </PageHeader>
      <CalendarView events={events} isStaff={isStaff} />
    </>
  );
}
