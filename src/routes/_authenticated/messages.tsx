import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchConversations } from "@/lib/api";
import { flagFor, timeAgo } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Birthday Twin" },
      { name: "description", content: "Private conversations with your Birthday Twins." },
      { property: "og:title", content: "Messages — Birthday Twin" },
      { property: "og:description", content: "Private conversations with your Birthday Twins." },
    ],
  }),
  component: MessagesLayout,
});

function MessagesLayout() {
  const match = useMatchRoute();
  if (match({ to: "/messages/$id" })) return <Outlet />;
  return <MessagesList />;
}

function MessagesList() {
  const { data: me } = useMyProfile();
  const convos = useQuery({ queryKey: ["conversations", me?.id], queryFn: () => fetchConversations(me!), enabled: !!me });

  return (
    <AppShell title="Messages">
      {convos.isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>}
      {convos.data && convos.data.length > 0 && (
        <div className="panel divide-y divide-border">
          {convos.data.map(({ profile, last, unread }) => (
            <Link key={profile.id} to="/messages/$id" params={{ id: profile.id }} className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40">
              <img src={profile.avatar_url ?? ""} alt="" className="size-12 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{profile.first_name} <span className="font-normal text-muted-foreground">{flagFor(profile.country_code)}</span></p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(last.created_at)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{last.sender_id === me?.id ? "You: " : ""}{last.body}</p>
              </div>
              {unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{unread}</span>}
            </Link>
          ))}
        </div>
      )}
      {convos.data?.length === 0 && (
        <EmptyState emoji="💬" title="No conversations yet" description="Say hello to a Birthday Twin — ask them what their day looks like." action={<Link to="/twins"><Button className="rounded-full">Find someone to talk to</Button></Link>} />
      )}
    </AppShell>
  );
}
