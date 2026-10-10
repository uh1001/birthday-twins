import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { daysUntilBirthday, timeAgo } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Birthday Twin" },
      { name: "description", content: "New twins, connections, messages and birthday milestones." },
      { property: "og:title", content: "Notifications — Birthday Twin" },
      { property: "og:description", content: "Your Birthday Twin activity." },
    ],
  }),
  component: NotificationsPage,
});

const ICON: Record<string, string> = { twins: "🎂", connection: "🤝", message: "💬", comment: "💭", reaction: "❤️", community: "🌍", milestone: "⏳", birthday: "🎉" };

function NotificationsPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications", me?.id],
    enabled: !!me,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("profile_id", me!.id).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const days = me ? daysUntilBirthday(me.birth_month, me.birth_day) : null;

  async function markAll() {
    if (!me) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", me.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <AppShell title="Notifications">
      {days !== null && days <= 30 && (
        <div className="panel mb-3 flex items-center gap-3 p-4">
          <span className="text-2xl">⏳</span>
          <p className="text-sm">{days === 0 ? "Happy birthday! Your twins are celebrating too 🎉" : `${days} days until your birthday — and your twins'.`}</p>
        </div>
      )}
      {list.data && list.data.length > 0 && (
        <>
          <div className="mb-2 flex justify-end"><Button variant="ghost" size="sm" onClick={markAll} className="rounded-full">Mark all read</Button></div>
          <div className="panel divide-y divide-border">
            {list.data.map((n) => (
              <div key={n.id} className="flex gap-3 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent">{ICON[n.kind] ?? "✨"}</span>
                <div className="min-w-0 flex-1">
                  <p className={n.read_at ? "text-sm" : "text-sm font-semibold"}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {list.data?.length === 0 && <EmptyState emoji="🔔" title="All quiet for now" description="We'll let you know when new Birthday Twins join or someone reaches out." />}
    </AppShell>
  );
}
