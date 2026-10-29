"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { SESSION_TOPICS } from "@/lib/constants";
import { safeUrl, str, strOrNull } from "@/lib/utils";

export type SessionFormState = { error?: string } | null;

function payload(formData: FormData) {
  const startsAt = new Date(str(formData, "starts_at"));
  if (Number.isNaN(startsAt.getTime())) return { error: "Elige una fecha y hora válidas." };
  const meetUrl = safeUrl(strOrNull(formData, "meet_url"));
  if (!meetUrl || !meetUrl.startsWith("https://")) return { error: "Pega el enlace de Google Meet (https://meet.google.com/...)." };
  const title = str(formData, "title");
  if (!title) return { error: "Ponle un título a la sesión." };
  const topic = SESSION_TOPICS.some((t) => t.id === str(formData, "topic")) ? str(formData, "topic") : "general";
  const duration = Math.min(Math.max(parseInt(str(formData, "duration_minutes"), 10) || 60, 15), 480);
  const max = parseInt(str(formData, "max_attendees"), 10);
  return {
    data: {
      title: title.slice(0, 120),
      description: strOrNull(formData, "description"),
      topic,
      starts_at: startsAt.toISOString(),
      duration_minutes: duration,
      meet_url: meetUrl,
      max_attendees: Number.isFinite(max) && max >= 2 ? Math.min(max, 500) : null,
    },
  };
}

export async function createSession(_prev: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { supabase, user } = await requireActive();
  const result = payload(formData);
  if ("error" in result) return { error: result.error };
  if (new Date(result.data.starts_at).getTime() < Date.now() - 15 * 60000) {
    return { error: "La sesión no puede empezar en el pasado." };
  }
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ ...result.data, host_id: user.id })
    .select("id")
    .single();
  if (error) return { error: `No se pudo crear: ${error.message}` };
  revalidatePath("/sesiones");
  revalidatePath("/inicio");
  redirect(`/sesiones/${data.id}`);
}

export async function updateSession(_prev: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { supabase } = await requireActive();
  const id = str(formData, "id");
  const result = payload(formData);
  if ("error" in result) return { error: result.error };
  const { error } = await supabase.from("study_sessions").update(result.data).eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };
  revalidatePath("/sesiones", "layout");
  revalidatePath("/inicio");
  redirect(`/sesiones/${id}`);
}

export async function deleteSession(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("study_sessions").delete().eq("id", str(formData, "id"));
  revalidatePath("/sesiones", "layout");
  revalidatePath("/inicio");
  redirect("/sesiones");
}

export async function joinSession(formData: FormData) {
  const { supabase, user } = await requireActive();
  const id = str(formData, "id");
  const { error } = await supabase.from("session_attendees").insert({ session_id: id, user_id: user.id });
  revalidatePath("/sesiones", "layout");
  revalidatePath("/inicio");
  if (error && error.code !== "23505") redirect(`/sesiones/${id}?error=llena`);
  redirect(`/sesiones/${id}`);
}

export async function leaveSession(formData: FormData) {
  const { supabase, user } = await requireActive();
  const id = str(formData, "id");
  await supabase.from("session_attendees").delete().eq("session_id", id).eq("user_id", user.id);
  revalidatePath("/sesiones", "layout");
  revalidatePath("/inicio");
  redirect(`/sesiones/${id}`);
}
