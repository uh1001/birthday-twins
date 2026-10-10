import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Flag, Heart, MessageCircle, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DemoBadge } from "@/components/DemoBadge";
import { supabase } from "@/integrations/supabase/client";
import { fetchComments, reportContent, type FeedItem, type Moment, type Profile } from "@/lib/api";
import { flagFor, monthDayLabel, timeAgo } from "@/lib/birthday";

const KIND_LABEL: Record<string, string> = { moment: "Moment", post: "Post", journey: "Journey" };

type Props = {
  moment: Moment & Partial<Pick<FeedItem, "likeCount" | "commentCount" | "liked" | "saved">>;
  me?: Profile | null | undefined;
  defaultOpenComments?: boolean;
};

export function MomentCard({ moment, me, defaultOpenComments = false }: Props) {
  const author = moment.profiles;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!moment.liked);
  const [likes, setLikes] = useState(moment.likeCount ?? 0);
  const [saved, setSaved] = useState(!!moment.saved);
  const [open, setOpen] = useState(defaultOpenComments);
  const [commentCount, setCommentCount] = useState(moment.commentCount ?? 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(moment.body);
  const [body, setBody] = useState(moment.body);
  const [deleted, setDeleted] = useState(false);
  const isOwner = !!me && me.id === moment.profile_id;

  async function toggleLike() {
    if (!me) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("likes").insert({ moment_id: moment.id, profile_id: me.id })
      : await supabase.from("likes").delete().eq("moment_id", moment.id).eq("profile_id", me.id);
    if (error && !error.message.includes("duplicate")) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      toast.error("Couldn't react right now");
    }
  }

  async function toggleSave() {
    if (!me) return;
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("saves").insert({ moment_id: moment.id, profile_id: me.id })
      : await supabase.from("saves").delete().eq("moment_id", moment.id).eq("profile_id", me.id);
    if (error && !error.message.includes("duplicate")) {
      setSaved(!next);
      toast.error("Couldn't save");
      return;
    }
    toast.success(next ? "Saved" : "Removed from saved");
    qc.invalidateQueries({ queryKey: ["saved"] });
  }

  async function share() {
    const url = `${window.location.origin}/p/${moment.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Birthday Twin", text: body.slice(0, 120), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* dismissed */
    }
  }

  async function saveEdit() {
    const text = draft.trim();
    if (text.length > 2000) return toast.error("Keep it under 2,000 characters");
    if (!text && !moment.image_url && !moment.video_url) return toast.error("Write something");
    const { error } = await supabase.from("moments").update({ body: text, updated_at: new Date().toISOString() }).eq("id", moment.id);
    if (error) return toast.error("Couldn't save changes");
    setBody(text);
    setEditing(false);
    toast.success("Updated");
  }

  async function remove() {
    if (!window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("moments").delete().eq("id", moment.id);
    if (error) return toast.error("Couldn't delete");
    setDeleted(true);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["feed"] });
  }

  async function report() {
    if (!me) return;
    const reason = window.prompt("What's wrong with this post?")?.trim();
    if (!reason) return;
    const { error } = await reportContent({ reporterId: me.id, reportedId: moment.profile_id, reason, momentId: moment.id });
    if (error) return toast.error("Couldn't send report");
    toast.success("Thanks — a moderator will review it");
  }

  if (deleted) return null;

  return (
    <article className="panel p-4">
      <div className="flex items-center gap-3">
        {author && (
          <Link to="/u/$username" params={{ username: author.username }} className="shrink-0">
            <img src={author.avatar_url ?? ""} alt={author.first_name} className="size-10 rounded-full bg-surface object-cover" loading="lazy" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {author ? (
              <Link to="/u/$username" params={{ username: author.username }} className="truncate text-sm font-semibold hover:underline">
                {author.first_name}
              </Link>
            ) : (
              <span className="text-sm font-semibold">Someone</span>
            )}
            {author?.is_demo && <DemoBadge />}
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{KIND_LABEL[moment.kind] ?? "Post"}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {(moment.city || moment.country) && <>{flagFor(author?.country_code)} {moment.city ?? moment.country} · </>}
            {author?.birth_month && (
              <Link to="/community" search={{ m: author.birth_month, d: author.birth_day ?? undefined }} className="hover:text-primary">
                🎂 {monthDayLabel(author.birth_month, author.birth_day)}
              </Link>
            )}
            {" · "}
            {timeAgo(moment.created_at)}
            {moment.updated_at ? " · edited" : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Post options" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner ? (
              <>
                <DropdownMenuItem onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={remove} className="text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={report}><Flag className="size-4" /> Report post</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate({ to: "/p/$id", params: { id: moment.id } })}>Open post</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} className="min-h-20 rounded-xl" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setEditing(false); setDraft(body); }}>Cancel</Button>
            <Button size="sm" className="rounded-full" onClick={saveEdit}>Save</Button>
          </div>
        </div>
      ) : (
        body && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{body}</p>
      )}

      {moment.video_url ? (
        <video src={moment.video_url} controls playsInline preload="metadata" className="mt-3 max-h-[28rem] w-full rounded-2xl bg-foreground/5" />
      ) : moment.image_url ? (
        <img src={moment.image_url} alt="" className="mt-3 max-h-[28rem] w-full rounded-2xl bg-surface object-cover" loading="lazy" />
      ) : null}

      <div className="mt-3 flex items-center gap-1 text-muted-foreground">
        <ActionButton onClick={toggleLike} label={liked ? "Unlike" : "Like"}>
          <Heart className={liked ? "size-4 fill-primary text-primary" : "size-4"} /> {likes > 0 ? likes : "Like"}
        </ActionButton>
        <ActionButton onClick={() => setOpen((o) => !o)} label="Comments">
          <MessageCircle className="size-4" /> {commentCount > 0 ? commentCount : "Comment"}
        </ActionButton>
        <ActionButton onClick={share} label="Share"><Share2 className="size-4" /> Share</ActionButton>
        <div className="flex-1" />
        <ActionButton onClick={toggleSave} label={saved ? "Unsave" : "Save"}>
          <Bookmark className={saved ? "size-4 fill-primary text-primary" : "size-4"} />
        </ActionButton>
      </div>

      {open && <Comments momentId={moment.id} me={me} onCount={setCommentCount} />}
    </article>
  );
}

function ActionButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors hover:bg-accent hover:text-primary">
      {children}
    </button>
  );
}

function Comments({ momentId, me, onCount }: { momentId: string; me?: Profile | null; onCount: (n: number) => void }) {
  const [text, setText] = useState("");
  const list = useQuery({ queryKey: ["comments", momentId], queryFn: () => fetchComments(momentId) });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const body = text.trim();
    if (!body) return;
    if (body.length > 1000) return toast.error("Keep comments under 1,000 characters");
    const { error } = await supabase.from("comments").insert({ moment_id: momentId, profile_id: me.id, body });
    if (error) return toast.error("Couldn't comment");
    setText("");
    const r = await list.refetch();
    onCount(r.data?.length ?? 0);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete comment");
    const r = await list.refetch();
    onCount(r.data?.length ?? 0);
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {list.isLoading && <p className="text-xs text-muted-foreground">Loading comments…</p>}
      {list.data?.length === 0 && <p className="text-xs text-muted-foreground">No comments yet. Start a thoughtful conversation.</p>}
      {list.data?.map((c) => (
        <div key={c.id} className="flex gap-2">
          <img src={c.profiles?.avatar_url ?? ""} alt="" className="size-7 rounded-full bg-surface object-cover" />
          <div className="min-w-0 flex-1 rounded-2xl bg-surface px-3 py-2">
            <p className="text-xs font-semibold">
              {c.profiles?.first_name} <span className="font-normal text-muted-foreground">· {timeAgo(c.created_at)}</span>
            </p>
            <p className="text-sm">{c.body}</p>
          </div>
          {me && (me.id === c.profile_id) && (
            <button onClick={() => remove(c.id)} aria-label="Delete comment" className="self-start p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
          )}
        </div>
      ))}
      {me && (
        <form onSubmit={send} className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" maxLength={1000} className="h-9 rounded-full" />
          <Button type="submit" size="sm" className="rounded-full">Post</Button>
        </form>
      )}
    </div>
  );
}
