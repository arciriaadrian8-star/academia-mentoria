"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActive, requireStaff } from "@/lib/auth";
import { safeUrl, str, strOrNull } from "@/lib/utils";

const BUCKET = "course-files";

/** Mueve un elemento arriba/abajo y renumera las posiciones. */
async function reorder(
  supabase: SupabaseClient,
  table: "courses" | "modules" | "lessons",
  id: string,
  direction: string,
  filter?: { column: string; value: string },
) {
  let query = supabase.from(table).select("id, position").order("position").order("created_at");
  if (filter) query = query.eq(filter.column, filter.value);
  const { data } = await query;
  const items = (data ?? []) as { id: string; position: number }[];
  const i = items.findIndex((item) => item.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  await Promise.all(
    items.map((item, index) => (item.position === index ? null : supabase.from(table).update({ position: index }).eq("id", item.id))),
  );
}

async function nextPosition(supabase: SupabaseClient, table: string, column?: string, value?: string) {
  let query = supabase.from(table).select("position").order("position", { ascending: false }).limit(1);
  if (column && value) query = query.eq(column, value);
  const { data } = await query;
  return data?.[0] ? data[0].position + 1 : 0;
}

async function removeStorageFiles(supabase: SupabaseClient, paths: (string | null)[]) {
  const clean = paths.filter((p): p is string => Boolean(p));
  if (clean.length) await supabase.storage.from(BUCKET).remove(clean);
}

async function filesOf(supabase: SupabaseClient, column: "course_id" | "module_id" | "id", value: string) {
  const { data: lessons } = await supabase.from("lessons").select("id, video_path").eq(column, value);
  const ids = (lessons ?? []).map((l) => l.id);
  const { data: files } = ids.length ? await supabase.from("lesson_files").select("path").in("lesson_id", ids) : { data: [] };
  return [...(lessons ?? []).map((l) => l.video_path), ...(files ?? []).map((f) => f.path)];
}

// ---------- CURSOS ----------

export async function createCourse(formData: FormData) {
  const { supabase } = await requireStaff();
  const title = str(formData, "title");
  if (!title) return;
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      description: strOrNull(formData, "description"),
      position: await nextPosition(supabase, "courses"),
    })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/classroom/${data.id}/editar`);
}

export async function updateCourse(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const { error } = await supabase
    .from("courses")
    .update({
      title: str(formData, "title"),
      description: strOrNull(formData, "description"),
      cover_url: safeUrl(strOrNull(formData, "cover_url")),
      published: formData.get("published") === "on",
      show_locked: formData.get("show_locked") === "on",
    })
    .eq("id", id);
  if (error) throw error;

  const levels = formData.getAll("levels").map(String);
  await supabase.from("course_access").delete().eq("course_id", id);
  if (levels.length) {
    await supabase.from("course_access").insert(levels.map((access_level_id) => ({ course_id: id, access_level_id })));
  }
  revalidatePath("/classroom", "layout");
  redirect(`/classroom/${id}/editar?guardado=1`);
}

export async function deleteCourse(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  await removeStorageFiles(supabase, await filesOf(supabase, "course_id", id));
  await supabase.from("courses").delete().eq("id", id);
  revalidatePath("/classroom", "layout");
  redirect("/classroom");
}

export async function moveCourse(formData: FormData) {
  const { supabase } = await requireStaff();
  await reorder(supabase, "courses", str(formData, "id"), str(formData, "direction"));
  revalidatePath("/classroom");
}

// ---------- MÓDULOS ----------

export async function createModule(formData: FormData) {
  const { supabase } = await requireStaff();
  const courseId = str(formData, "course_id");
  const title = str(formData, "title");
  if (!title) return;
  await supabase.from("modules").insert({
    course_id: courseId,
    title,
    position: await nextPosition(supabase, "modules", "course_id", courseId),
  });
  revalidatePath(`/classroom/${courseId}`, "layout");
}

export async function renameModule(formData: FormData) {
  const { supabase } = await requireStaff();
  const title = str(formData, "title");
  if (!title) return;
  await supabase.from("modules").update({ title }).eq("id", str(formData, "id"));
  revalidatePath(`/classroom/${str(formData, "course_id")}`, "layout");
}

export async function deleteModule(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  await removeStorageFiles(supabase, await filesOf(supabase, "module_id", id));
  await supabase.from("modules").delete().eq("id", id);
  revalidatePath(`/classroom/${str(formData, "course_id")}`, "layout");
}

export async function moveModule(formData: FormData) {
  const { supabase } = await requireStaff();
  const courseId = str(formData, "course_id");
  await reorder(supabase, "modules", str(formData, "id"), str(formData, "direction"), { column: "course_id", value: courseId });
  revalidatePath(`/classroom/${courseId}`, "layout");
}

// ---------- LECCIONES ----------

export async function createLesson(formData: FormData) {
  const { supabase } = await requireStaff();
  const courseId = str(formData, "course_id");
  const moduleId = str(formData, "module_id");
  const title = str(formData, "title");
  if (!title) return;
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      module_id: moduleId,
      title,
      position: await nextPosition(supabase, "lessons", "module_id", moduleId),
    })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/classroom/${courseId}/${data.id}/editar`);
}

export async function updateLesson(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const courseId = str(formData, "course_id");
  const moduleId = str(formData, "module_id");

  const { data: current } = await supabase.from("lessons").select("module_id, video_path").eq("id", id).single();
  if (!current) throw new Error("Lección no encontrada");

  const videoPath = strOrNull(formData, "video_path");
  if (current.video_path && current.video_path !== videoPath) {
    await removeStorageFiles(supabase, [current.video_path]);
  }

  const update: Record<string, unknown> = {
    title: str(formData, "title"),
    content: strOrNull(formData, "content"),
    video_url: videoPath ? null : safeUrl(strOrNull(formData, "video_url")),
    video_path: videoPath,
    published: formData.get("published") === "on",
  };
  if (moduleId && moduleId !== current.module_id) {
    update.module_id = moduleId;
    update.position = await nextPosition(supabase, "lessons", "module_id", moduleId);
  }

  const { error } = await supabase.from("lessons").update(update).eq("id", id);
  if (error) throw error;
  revalidatePath(`/classroom/${courseId}`, "layout");
  redirect(`/classroom/${courseId}/${id}`);
}

export async function deleteLesson(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const courseId = str(formData, "course_id");
  await removeStorageFiles(supabase, await filesOf(supabase, "id", id));
  await supabase.from("lessons").delete().eq("id", id);
  revalidatePath(`/classroom/${courseId}`, "layout");
  redirect(`/classroom/${courseId}/editar`);
}

export async function moveLesson(formData: FormData) {
  const { supabase } = await requireStaff();
  const courseId = str(formData, "course_id");
  await reorder(supabase, "lessons", str(formData, "id"), str(formData, "direction"), {
    column: "module_id",
    value: str(formData, "module_id"),
  });
  revalidatePath(`/classroom/${courseId}`, "layout");
}

// ---------- ARCHIVOS DE LECCIÓN ----------

export async function addLessonFile(input: { courseId: string; lessonId: string; name: string; path: string; size: number }) {
  const { supabase } = await requireStaff();
  if (!input.path.startsWith(`${input.courseId}/${input.lessonId}/`)) throw new Error("Ruta no válida");
  const { error } = await supabase.from("lesson_files").insert({
    lesson_id: input.lessonId,
    course_id: input.courseId,
    name: input.name.slice(0, 200),
    path: input.path,
    size: input.size,
  });
  if (error) throw error;
  revalidatePath(`/classroom/${input.courseId}`, "layout");
}

export async function deleteLessonFile(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const { data: file } = await supabase.from("lesson_files").select("path, course_id").eq("id", id).single();
  if (!file) return;
  await removeStorageFiles(supabase, [file.path]);
  await supabase.from("lesson_files").delete().eq("id", id);
  revalidatePath(`/classroom/${file.course_id}`, "layout");
}

// ---------- PROGRESO ----------

export async function toggleComplete(formData: FormData) {
  const { supabase, user } = await requireActive();
  const lessonId = str(formData, "lesson_id");
  const courseId = str(formData, "course_id");
  if (formData.get("completed") === "1") {
    await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  } else {
    await supabase.from("lesson_progress").insert({ user_id: user.id, lesson_id: lessonId, course_id: courseId });
  }
  revalidatePath(`/classroom/${courseId}`, "layout");
  revalidatePath("/classroom");
}
