import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { Moment, Profile } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { flagFor, timeAgo } from "@/lib/birthday";
import { toast } from "sonner";

export function MomentCard({ moment, me }: { moment: Moment; me?: Profile | null }) {
  const author = moment.profiles;
  const [liked, setLiked] = useState(false);

  async function toggleLike() {
    if (!me) return;
    if (liked) {
      setLiked(false);
      await supabase.from("likes").delete().eq("moment_id", moment.id).eq("profile_id", me.id);
      return;
    }
    setLiked(true);
    const { error } = await supabase
      .from("likes")
      .insert({ moment_id: moment.id, profile_id: me.id });
    if (error && !error.message.includes("duplicate")) {
      setLiked(false);
      toast.error("Couldn't react right now");
    }
  }

  return (
    <article className="panel p-4">
      <div className="flex items-center gap-3">
        {author && (
          <Link to="/u/$username" params={{ username: author.username }} className="shrink-0">
            <img
              src={author.avatar_url ?? ""}
              alt={author.first_name}
              className="size-10 rounded-full object-cover"
              loading="lazy"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{author?.first_name ?? "Someone"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {flagFor(moment.country ?? author?.country_code)} {moment.city ?? author?.city} ·{" "}
            {timeAgo(moment.created_at)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed">{moment.body}</p>

      {moment.image_url && (
        <img
          src={moment.image_url}
          alt=""
          className="mt-3 max-h-96 w-full rounded-2xl object-cover"
          loading="lazy"
        />
      )}

      <div className="mt-3 flex items-center gap-4 text-muted-foreground">
        <button
          onClick={toggleLike}
          className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-primary"
        >
          <Heart className={liked ? "size-4 fill-primary text-primary" : "size-4"} />
          {liked ? "Liked" : "Like"}
        </button>
        {author && (
          <Link
            to="/u/$username"
            params={{ username: author.username }}
            className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-primary"
          >
            <MessageCircle className="size-4" />
            View profile
          </Link>
        )}
      </div>
    </article>
  );
}
