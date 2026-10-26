"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";
import { safeUrl, str, strOrNull } from "@/lib/utils";

const RECURRENCES = ["none", "weekly", "biweekly", "monthly"];

function eventPayload(formData: FormData) {
  const startsAt = new Date(str(formData, "starts_at"));
  if (Number.isNaN(startsAt.getTime())) throw new Error("Fecha no válida");
  const recurrence = RECURRENCES.includes(str(formData, "recurrence")) ? str(formData, "recurrence") : "none";
  const duration = Math.min(Math.max(parseInt(str(formData, "duration_minutes"), 10) || 60, 5), 24 * 60);
  return {
    title: str(formData, "title"),
    description: strOrNull(formData, "description"),
    starts_at: startsAt.toISOString(),
    duration_minutes: duration,
    meeting_url: safeUrl(strOrNull(formData, "meeting_url")),
    location: strOrNull(formData, "location"),
    recurrence,
    recurrence_until: recurrence === "none" ? null : strOrNull(formData, "recurrence_until"),
  };
}

async function saveAudience(supabase: SupabaseClient, eventId: string, formData: FormData) {
  const levels = formData.getAll("levels").map(String);
  const members = formData.getAll("members").map(String);
  await Promise.all([
    supabase.from("event_access").delete().eq("event_id", eventId),
    supabase.from("event_members").delete().eq("event_id", eventId),
  ]);
  await Promise.all([
    levels.length && supabase.from("event_access").insert(levels.map((access_level_id) => ({ event_id: eventId, access_level_id }))),
    members.length && supabase.from("event_members").insert(members.map((user_id) => ({ event_id: eventId, user_id }))),
  ]);
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...eventPayload(formData), created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;
  await saveAudience(supabase, data.id, formData);
  revalidatePath("/", "layout");
  redirect("/calendario");
}

export async function updateEvent(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const { error } = await supabase.from("events").update(eventPayload(formData)).eq("id", id);
  if (error) throw error;
  await saveAudience(supabase, id, formData);
  revalidatePath("/", "layout");
  redirect("/calendario");
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("events").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
  redirect("/calendario");
}
