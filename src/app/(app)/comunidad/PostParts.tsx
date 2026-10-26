import { Heart, Pin } from "lucide-react";
import { POST_CATEGORIES, ROLE_LABELS } from "@/lib/constants";
import type { Author } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { toggleLike } from "./actions";

export function AuthorLine({ author, date, category, pinned }: {
  author: Author | null;
  date: string;
  category?: string;
  pinned?: boolean;
}) {
  const categoryLabel = POST_CATEGORIES.find((c) => c.id === category)?.label;
  return (
    <div className="flex items-center gap-3">
      <Avatar name={author?.full_name} url={author?.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
          {author?.full_name || "Miembro"}
          {author && author.role !== "member" && <span className="chip bg-brand/10 text-brand">{ROLE_LABELS[author.role]}</span>}
        </p>
        <p className="text-xs text-zinc-500">
          {timeAgo(date)}
          {categoryLabel && <> · {categoryLabel}</>}
        </p>
      </div>
      {pinned && (
        <span className="chip bg-amber-100 text-amber-800">
          <Pin className="size-3" /> Fijado
        </span>
      )}
    </div>
  );
}

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  return (
    <form action={toggleLike}>
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="liked" value={liked ? "1" : "0"} />
      <button className={cn("btn btn-ghost btn-sm", liked && "text-rose-600")}>
        <Heart className={cn("size-4", liked && "fill-current")} /> {count}
      </button>
    </form>
  );
}
