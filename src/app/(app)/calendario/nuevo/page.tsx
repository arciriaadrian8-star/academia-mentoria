import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { createEvent } from "../actions";
import { EventForm } from "../EventForm";
import { getAudienceOptions } from "../formData";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ miembro?: string }> }) {
  const { supabase } = await requireStaff();
  const { miembro } = await searchParams;
  const { levels, members } = await getAudienceOptions(supabase);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuevo evento" description="Llamadas de grupo, talleres en directo o sesiones 1 a 1." />
      <EventForm
        action={createEvent}
        levels={levels}
        members={members}
        selectedLevels={[]}
        selectedMembers={[]}
        defaultMember={members.some((m) => m.id === miembro) ? miembro : undefined}
      />
    </div>
  );
}
