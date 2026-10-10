import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    ],
  }),
  component: ModerationPage,
});

function ModerationPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ["reports"],
    enabled: !!me?.isModerator,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, reported:profiles!reports_reported_id_fkey(username, first_name), reporter:profiles!reports_reporter_id_fkey(username, first_name), moment:moments(id, body, image_url, video_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function resolve(id: string, status: "resolved" | "dismissed") {
    const { error } = await supabase.from("reports").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Couldn't update report");
    qc.invalidateQueries({ queryKey: ["reports"] });
  }
  async function removePost(reportId: string, momentId: string) {
    if (!window.confirm("Remove this post for everyone?")) return;
    const { error } = await supabase.from("moments").delete().eq("id", momentId);
    if (error) return toast.error("Couldn't remove post");
    toast.success("Post removed");
    await resolve(reportId, "resolved");
  }

  if (me && !me.isModerator) {
    return <AppShell title="Moderation"><EmptyState emoji="🛡️" title="Moderators only" description="You don't have access to moderation tools." /></AppShell>;
  }

  return (
    <AppShell title="Moderation">
      {reports.isLoading && <Skeleton className="h-32 rounded-3xl" />}
      {reports.isError && <EmptyState emoji="⚠️" title="Couldn't load reports" description="Try again shortly." />}
      {reports.data?.length === 0 && <EmptyState emoji="✅" title="No open reports" description="Communities are looking healthy." />}
      <div className="space-y-3">
        {reports.data?.map((r) => (
          <div key={r.id} className="panel space-y-2 p-4">
            <p className="text-xs text-muted-foreground">
              {timeAgo(r.created_at)} · reported by @{r.reporter?.username}
            </p>
            <p className="text-sm">
              <span className="font-semibold">About:</span>{" "}
              {r.reported ? <Link to="/u/$username" params={{ username: r.reported.username }} className="text-primary">@{r.reported.username}</Link> : "deleted user"}
            </p>
            <p className="rounded-xl bg-surface p-3 text-sm">“{r.reason}”</p>
            {r.moment && (
              <div className="rounded-xl border border-border p-3 text-sm">
                <p className="text-xs text-muted-foreground">Reported post</p>
                <p className="mt-1 line-clamp-4">{r.moment.body || "(media only)"}</p>
                {r.moment.image_url && <img src={r.moment.image_url} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {r.moment && <Button size="sm" variant="destructive" className="rounded-full" onClick={() => removePost(r.id, r.moment!.id)}>Remove post</Button>}
              <Button size="sm" className="rounded-full" onClick={() => resolve(r.id, "resolved")}>Mark resolved</Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => resolve(r.id, "dismissed")}>Dismiss</Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
