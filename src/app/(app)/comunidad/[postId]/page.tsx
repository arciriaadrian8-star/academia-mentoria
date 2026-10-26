import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin, Trash2 } from "lucide-react";
import { requireActive } from "@/lib/auth";
import type { Author } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Markdown } from "@/components/Markdown";
import { SubmitButton } from "@/components/SubmitButton";
import { addComment, deleteComment, deletePost, togglePin } from "../actions";
import { AuthorLine, LikeButton } from "../PostParts";

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const { supabase, user, profile, isStaff } = await requireActive();

  const [postRes, commentsRes] = await Promise.all([
    supabase
      .from("posts")
      .select("*, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role), post_likes(user_id)")
      .eq("id", postId)
      .maybeSingle(),
    supabase
      .from("comments")
      .select("id, body, created_at, author_id, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at"),
  ]);
  if (postRes.error) throw postRes.error;
  const post = postRes.data;
  if (!post) notFound();
  const comments = (commentsRes.data ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    author: Author | null;
  }[];
  const likes = (post.post_likes ?? []) as { user_id: string }[];
  const canManage = isStaff || post.author_id === user.id;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/comunidad" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Comunidad
      </Link>

      <article className="card p-6">
        <AuthorLine author={post.author as Author} date={post.created_at} category={post.category} pinned={post.pinned} />
        <h1 className="mt-4 text-2xl font-bold">{post.title}</h1>
        <Markdown className="mt-3">{post.body}</Markdown>

        <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-zinc-100 pt-3">
          <LikeButton postId={post.id} liked={likes.some((l) => l.user_id === user.id)} count={likes.length} />
          <div className="ml-auto flex gap-1">
            {isStaff && (
              <form action={togglePin}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="pinned" value={post.pinned ? "1" : "0"} />
                <button className="btn btn-ghost btn-sm">
                  <Pin className="size-4" /> {post.pinned ? "Desfijar" : "Fijar"}
                </button>
              </form>
            )}
            {canManage && (
              <form action={deletePost}>
                <input type="hidden" name="id" value={post.id} />
                <ConfirmButton message="¿Borrar esta publicación?" className="btn-sm border-0">
                  <Trash2 className="size-4" /> Borrar
                </ConfirmButton>
              </form>
            )}
          </div>
        </div>
      </article>

      <section className="card mt-4 p-6">
        <h2 className="mb-4 text-sm font-semibold">{comments.length} comentarios</h2>
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author?.full_name} url={c.author?.avatar_url} size={34} />
              <div className="min-w-0 flex-1">
                <div className="rounded-xl bg-zinc-50 px-4 py-2.5">
                  <p className="text-sm font-semibold">{c.author?.full_name || "Miembro"}</p>
                  <p className="mt-0.5 text-sm whitespace-pre-line text-zinc-700">{c.body}</p>
                </div>
                <div className="mt-1 flex items-center gap-3 px-2 text-xs text-zinc-400">
                  {timeAgo(c.created_at)}
                  {(isStaff || c.author_id === user.id) && (
                    <form action={deleteComment}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="post_id" value={post.id} />
                      <button className="hover:text-red-600">Borrar</button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <form action={addComment} className="mt-6 flex gap-3">
          <input type="hidden" name="post_id" value={post.id} />
          <Avatar name={profile.full_name} url={profile.avatar_url} size={34} />
          <div className="flex-1 space-y-2">
            <textarea name="body" required rows={2} placeholder="Escribe un comentario..." className="input" />
            <div className="flex justify-end">
              <SubmitButton className="btn-sm" pendingText="Enviando...">Comentar</SubmitButton>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
