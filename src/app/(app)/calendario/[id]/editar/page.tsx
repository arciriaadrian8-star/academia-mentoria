import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { CalendarEvent } from "@/lib/types";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { deleteEvent, updateEvent } from "../../actions";
import { EventForm } from "../../EventForm";
import { getAudienceOptions } from "../../formData";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const [eventRes, accessRes, membersRes, options] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("event_access").select("access_level_id").eq("event_id", id),
    supabase.from("event_members").select("user_id").eq("event_id", id),
    getAudienceOptions(supabase),
  ]);
  const event = eventRes.data as CalendarEvent | null;
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Editar evento" />
      <EventForm
        action={updateEvent}
        event={event}
        levels={options.levels}
        members={options.members}
        selectedLevels={(accessRes.data ?? []).map((r) => r.access_level_id as string)}
        selectedMembers={(membersRes.data ?? []).map((r) => r.user_id as string)}
      />
      <form action={deleteEvent} className="card mt-6 flex items-center justify-between gap-3 p-5">
        <input type="hidden" name="id" value={event.id} />
        <p className="text-sm text-zinc-500">
          Borrar este evento{event.recurrence !== "none" ? " y todas sus repeticiones" : ""}.
        </p>
        <ConfirmButton message={`¿Borrar «${event.title}»?`}>
          <Trash2 className="size-4" /> Borrar
        </ConfirmButton>
      </form>
    </div>
  );
}
