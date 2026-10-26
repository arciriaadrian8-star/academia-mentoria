"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive } from "@/lib/auth";
import { POST_CATEGORIES } from "@/lib/constants";
import { str } from "@/lib/utils";

export async function createPost(formData: FormData) {
  const { supabase, user, isStaff } = await requireActive();
  const title = str(formData, "title");
  if (!title) return;
  const category = POST_CATEGORIES.find((c) => c.id === str(formData, "category") && (!c.staffOnly || isStaff))?.id ?? "general";
  await supabase.from("posts").insert({ author_id: user.id, title, body: str(formData, "body"), category });
  revalidatePath("/comunidad");
}

export async function deletePost(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("posts").delete().eq("id", str(formData, "id"));
  revalidatePath("/comunidad");
  redirect("/comunidad");
}

export async function togglePin(formData: FormData) {
  const { supabase } = await requireActive();
  const id = str(formData, "id");
  await supabase.from("posts").update({ pinned: formData.get("pinned") !== "1" }).eq("id", id);
  revalidatePath("/comunidad", "layout");
}

export async function toggleLike(formData: FormData) {
  const { supabase, user } = await requireActive();
  const postId = str(formData, "post_id");
  if (formData.get("liked") === "1") {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath("/comunidad", "layout");
}

export async function addComment(formData: FormData) {
  const { supabase, user } = await requireActive();
  const postId = str(formData, "post_id");
  const body = str(formData, "body");
  if (!body) return;
  await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body });
  revalidatePath(`/comunidad/${postId}`);
}

export async function deleteComment(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from("comments").delete().eq("id", str(formData, "id"));
  revalidatePath(`/comunidad/${str(formData, "post_id")}`);
}
