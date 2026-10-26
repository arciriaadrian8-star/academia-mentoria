import Link from "next/link";
import { MessageCircle, MessagesSquare } from "lucide-react";
import { getSettings, requireActive } from "@/lib/auth";
import { POST_CATEGORIES } from "@/lib/constants";
import { getEvents } from "@/lib/events";
import type { Author } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/PageHeader";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { Composer } from "./Composer";
import { AuthorLine, LikeButton } from "./PostParts";

interface PostRow {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  created_at: string;
  author: Author | null;
  comments: { count: number }[];
  post_likes: { user_id: string }[];
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const { supabase, user, profile, isStaff } = await requireActive();

  let query = supabase
    .from("posts")
    .select("id, title, body, category, pinned, created_at, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role), comments(count), post_likes(user_id)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (categoria) query = query.eq("category", categoria);

  const [postsRes, settings, events, membersRes] = await Promise.all([
    query,
    getSettings(),
    getEvents(supabase, false),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  if (postsRes.error) throw postsRes.error;
  const posts = (postsRes.data ?? []) as unknown as PostRow[];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <Composer name={profile.full_name || profile.email} avatarUrl={profile.avatar_url} isStaff={isStaff} />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: "", label: "Todo" }, ...POST_CATEGORIES].map((c) => (
            <Link
              key={c.id}
              href={c.id ? `/comunidad?categoria=${c.id}` : "/comunidad"}
              className={cn(
                "chip shrink-0 px-3 py-1.5 text-sm",
                (categoria ?? "") === c.id ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50",
              )}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <EmptyState icon={<MessagesSquare className="size-10" />} title="Aún no hay publicaciones">
            ¡Sé el primero en escribir algo!
          </EmptyState>
        ) : (
          posts.map((post) => {
            const liked = post.post_likes.some((l) => l.user_id === user.id);
            return (
              <article key={post.id} className={cn("card p-5", post.pinned && "ring-1 ring-amber-200")}>
                <AuthorLine author={post.author} date={post.created_at} category={post.category} pinned={post.pinned} />
                <Link href={`/comunidad/${post.id}`} className="mt-3 block">
                  <h2 className="text-lg font-bold hover:text-brand">{post.title}</h2>
                  {post.body && <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-zinc-600">{post.body}</p>}
                </Link>
                <div className="mt-3 flex items-center gap-1">
                  <LikeButton postId={post.id} liked={liked} count={post.post_likes.length} />
                  <Link href={`/comunidad/${post.id}`} className="btn btn-ghost btn-sm">
                    <MessageCircle className="size-4" /> {post.comments[0]?.count ?? 0}
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-32">
        <div className="card overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-brand to-brand/60" />
          <div className="p-5">
            <h2 className="font-bold">{settings.academy_name}</h2>
            {settings.tagline && <p className="text-sm text-zinc-500">{settings.tagline}</p>}
            {settings.welcome_message && <p className="mt-3 text-sm whitespace-pre-line text-zinc-700">{settings.welcome_message}</p>}
            <p className="mt-4 text-xs font-medium text-zinc-500">{membersRes.count ?? 0} miembros</p>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">Próximos eventos</h3>
          <UpcomingEvents events={events} isStaff={isStaff} />
        </div>
      </aside>
    </div>
  );
}
