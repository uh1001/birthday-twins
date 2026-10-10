import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import type { Notification } from "@/lib/api";
import { daysUntilBirthday, timeAgo } from "@/lib/birthday";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Birthday Twin" },
      { name: "description", content: "Likes, comments, connections, messages, community activity and birthdays." },
      { property: "og:title", content: "Notifications — Birthday Twin" },
      { property: "og:description", content: "Your Birthday Twin activity." },
    ],
  }),
  component: NotificationsPage,
});

const ICON: Record<string, string> = { twins: "🎂", connection: "🤝", message: "💬", comment: "💭", reaction: "❤️", community: "🌍", milestone: "⏳", birthday: "🎉", challenge: "🏅" };
const CATS = [
  { id: "all", label: "All" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "connections", label: "Connections" },
  { id: "messages", label: "Messages" },
  { id: "community", label: "Community" },
  { id: "birthdays", label: "Birthdays" },
];

function NotificationsPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cat, setCat] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useQuery({
    queryKey: ["notifications", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("profile_id", me!.id).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const days = me ? daysUntilBirthday(me.birth_month, me.birth_day) : null;
  const items = (list.data ?? []).filter((n) => (cat === "all" || n.category === cat) && (!unreadOnly || !n.read_at));

  function refresh() {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread-notifications"] });
  }
  async function markAll() {
    if (!me) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", me.id).is("read_at", null);
    refresh();
  }
  async function setRead(n: Notification, read: boolean) {
    await supabase.from("notifications").update({ read_at: read ? new Date().toISOString() : null }).eq("id", n.id);
    refresh();
  }
  async function open(n: Notification) {
    if (!n.read_at) await setRead(n, true);
    if (n.link) navigate({ href: n.link });
  }

  return (
    <AppShell title="Notifications">
      {days !== null && days <= 30 && (
        <div className="panel mb-3 flex items-center gap-3 p-4">
          <span className="text-2xl">⏳</span>
          <p className="text-sm">{days === 0 ? "Happy birthday! Your twins are celebrating too 🎉" : `${days} days until your birthday — and your twins'.`}</p>
        </div>
      )}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {CATS.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium", cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only
        </label>
        <div className="flex gap-1">
          <Link to="/me" className="px-2 text-xs text-muted-foreground hover:text-foreground">Preferences</Link>
          <Button variant="ghost" size="sm" onClick={markAll} className="rounded-full">Mark all read</Button>
        </div>
      </div>
      {list.isLoading && <Skeleton className="h-48 rounded-3xl" />}
      {list.isError && <EmptyState emoji="⚠️" title="Couldn't load notifications" description="Try again in a moment." />}
      {items.length > 0 && (
        <div className="panel divide-y divide-border">
          {items.map((n) => (
            <div key={n.id} className={cn("flex gap-3 p-4", !n.read_at && "bg-accent/30")}>
              <button onClick={() => open(n)} className="flex min-w-0 flex-1 gap-3 text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent">{ICON[n.kind] ?? "✨"}</span>
                <div className="min-w-0 flex-1">
                  <p className={n.read_at ? "text-sm" : "text-sm font-semibold"}>{n.title}</p>
                  {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
              </button>
              <button onClick={() => setRead(n, !n.read_at)} className="self-start text-[11px] text-muted-foreground hover:text-foreground">
                {n.read_at ? "Mark unread" : "Mark read"}
              </button>
            </div>
          ))}
        </div>
      )}
      {list.data && items.length === 0 && <EmptyState emoji="🔔" title="All quiet for now" description="We'll let you know when twins interact with you or your community has news." />}
    </AppShell>
  );
}
