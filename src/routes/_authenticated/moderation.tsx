import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { timeAgo } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation — Birthday Twin" },
      { name: "description", content: "Review reports and manage community content." },
      { property: "og:title", content: "Moderation — Birthday Twin" },
      { property: "og:description", content: "Moderator tools for Birthday Twin communities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModerationPage,
});

function errMsg(e: unknown) {
  return e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Something went wrong";
}

function ModerationPage() {
  const { data: me, isLoading } = useMyProfile();
  if (isLoading || !me) return <AppShell title="Moderation"><Skeleton className="h-32 rounded-3xl" /></AppShell>;
  if (!me.isModerator) {
    return <AppShell title="Moderation"><EmptyState emoji="🛡️" title="Moderators only" description="You don't have access to moderation tools." /></AppShell>;
  }
  return (
    <AppShell title="Moderation">
      <Tabs defaultValue="reports">
        <TabsList className="mb-4 rounded-full">
          <TabsTrigger value="reports" className="rounded-full">Reports</TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-full">Challenges</TabsTrigger>
          <TabsTrigger value="log" className="rounded-full">Action log</TabsTrigger>
        </TabsList>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="challenges"><Challenges /></TabsContent>
        <TabsContent value="log"><ActionLog /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Reports() {
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, reported:profiles!reports_reported_id_fkey(username, first_name), reporter:profiles!reports_reporter_id_fkey(username, first_name), moment:moments(id, body, image_url, video_url), comment:comments(id, body)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (reports.isLoading) return <Skeleton className="h-32 rounded-3xl" />;
  if (reports.isError) return <EmptyState emoji="⚠️" title="Couldn't load reports" description="Try again shortly." />;
  if (!reports.data?.length) return <EmptyState emoji="✅" title="No open reports" description="Communities are looking healthy." />;
  return (
    <div className="space-y-3">
      {reports.data.map((r) => (
        <ReportCard key={r.id} r={r} onDone={() => { qc.invalidateQueries({ queryKey: ["reports"] }); qc.invalidateQueries({ queryKey: ["mod-log"] }); }} />
      ))}
    </div>
  );
}

type ReportRow = {
  id: string; created_at: string; reason: string;
  reported: { username: string } | null; reporter: { username: string } | null;
  moment: { id: string; body: string; image_url: string | null; video_url: string | null } | null;
  comment: { id: string; body: string } | null;
};

function ReportCard({ r, onDone }: { r: ReportRow; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(action: "dismiss" | "resolve" | "remove_post" | "remove_comment") {
    if (!note.trim()) return void toast.error("Add a short reason for the record");
    if (action.startsWith("remove") && !window.confirm("Remove this content for everyone?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("moderate_report", { p_report: r.id, p_action: action, p_reason: note.trim() });
    setBusy(false);
    if (error) return void toast.error(errMsg(error));
    toast.success("Done — action recorded");
    onDone();
  }
  return (
    <div className="panel space-y-2 p-4">
      <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)} · reported by @{r.reporter?.username ?? "unknown"}</p>
      <p className="text-sm">
        <span className="font-semibold">{r.moment ? "Post by" : r.comment ? "Comment by" : "Profile:"}</span>{" "}
        {r.reported ? <Link to="/u/$username" params={{ username: r.reported.username }} className="text-primary">@{r.reported.username}</Link> : "deleted user"}
      </p>
      <p className="rounded-xl bg-surface p-3 text-sm"><span className="text-xs text-muted-foreground">Reason: </span>“{r.reason}”</p>
      {r.moment && (
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="text-xs text-muted-foreground">Reported post · <Link to="/p/$id" params={{ id: r.moment.id }} className="text-primary">open</Link></p>
          <p className="mt-1 line-clamp-4">{r.moment.body || "(media only)"}</p>
          {r.moment.image_url && <img src={r.moment.image_url} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />}
          {r.moment.video_url && <video src={r.moment.video_url} controls className="mt-2 max-h-40 rounded-lg" />}
        </div>
      )}
      {r.comment && (
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="text-xs text-muted-foreground">Reported comment</p>
          <p className="mt-1">{r.comment.body}</p>
        </div>
      )}
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Moderator reason (saved to the action log)" maxLength={300} />
      <div className="flex flex-wrap gap-2">
        {r.moment && <Button size="sm" variant="destructive" disabled={busy} className="rounded-full" onClick={() => act("remove_post")}>Remove post</Button>}
        {r.comment && <Button size="sm" variant="destructive" disabled={busy} className="rounded-full" onClick={() => act("remove_comment")}>Remove comment</Button>}
        <Button size="sm" disabled={busy} className="rounded-full" onClick={() => act("resolve")}>Mark resolved</Button>
        <Button size="sm" variant="ghost" disabled={busy} className="rounded-full" onClick={() => act("dismiss")}>Dismiss</Button>
      </div>
    </div>
  );
}

type Challenge = { id: string; title: string; description: string; starts_on: string; ends_on: string; xp: number };

function Challenges() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Challenge> | null>(null);
  const list = useQuery({
    queryKey: ["mod-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_challenges").select("*").order("starts_on", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Challenge[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["mod-challenges"] }); qc.invalidateQueries({ queryKey: ["mod-log"] }); qc.invalidateQueries(); };

  async function remove(c: Challenge) {
    const reason = window.prompt(`Reason for deleting “${c.title}”?`);
    if (!reason?.trim()) return;
    const { error } = await supabase.rpc("moderate_delete_challenge", { p_id: c.id, p_reason: reason.trim() });
    if (error) return void toast.error(errMsg(error));
    toast.success("Challenge deleted");
    refresh();
  }

  return (
    <div className="space-y-3">
      {editing ? (
        <ChallengeForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      ) : (
        <Button className="rounded-full" onClick={() => setEditing({ xp: 25 })}>New challenge</Button>
      )}
      {list.isLoading && <Skeleton className="h-24 rounded-3xl" />}
      {list.data?.length === 0 && <EmptyState emoji="🏁" title="No challenges yet" description="Create one to get communities talking." />}
      {list.data?.map((c) => (
        <div key={c.id} className="panel flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-semibold">{c.title}</p>
            <p className="text-xs text-muted-foreground">{c.starts_on} → {c.ends_on} · {c.xp} XP</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(c)}>Edit</Button>
            <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => remove(c)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChallengeForm({ initial, onCancel, onSaved }: { initial: Partial<Challenge>; onCancel: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    title: initial.title ?? "", description: initial.description ?? "",
    starts_on: initial.starts_on ?? today, ends_on: initial.ends_on ?? today, xp: initial.xp ?? 25, reason: "",
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.title.trim()) return void toast.error("Title is required");
    if (f.ends_on < f.starts_on) return void toast.error("End date must be after start date");
    setBusy(true);
    const { error } = await supabase.rpc("moderate_save_challenge", {
      p_id: initial.id ?? (null as unknown as string), p_title: f.title, p_description: f.description,
      p_starts: f.starts_on, p_ends: f.ends_on, p_xp: Number(f.xp), p_reason: f.reason,
    });
    setBusy(false);
    if (error) return void toast.error(errMsg(error));
    toast.success("Challenge saved");
    onSaved();
  }
  return (
    <div className="panel space-y-2 p-4">
      <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" maxLength={120} />
      <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" maxLength={600} />
      <div className="grid grid-cols-3 gap-2">
        <Input type="date" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} aria-label="Starts" />
        <Input type="date" value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} aria-label="Ends" />
        <Input type="number" min={0} max={200} value={f.xp} onChange={(e) => setF({ ...f, xp: Number(e.target.value) })} aria-label="XP" />
      </div>
      <Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Note for the action log (optional)" maxLength={300} />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-full" disabled={busy} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ActionLog() {
  const log = useQuery({
    queryKey: ["mod-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_actions")
        .select("*, moderator:profiles!moderation_actions_moderator_profile_id_fkey(username)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (log.isLoading) return <Skeleton className="h-24 rounded-3xl" />;
  if (!log.data?.length) return <EmptyState emoji="📋" title="No actions yet" description="Moderator actions will be recorded here." />;
  return (
    <div className="space-y-2">
      {log.data.map((a) => (
        <div key={a.id} className="panel p-3 text-sm">
          <p><span className="font-semibold">@{a.moderator?.username ?? "moderator"}</span> · {a.action.replace(/_/g, " ")}</p>
          <p className="text-muted-foreground">“{a.reason}”</p>
          <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()} ({timeAgo(a.created_at)})</p>
        </div>
      ))}
    </div>
  );
}
