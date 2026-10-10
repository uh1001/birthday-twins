import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchConnectionsOf, fetchRequests, type Profile } from "@/lib/api";
import { flagFor, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({
    meta: [
      { title: "Connections — Birthday Twin" },
      { name: "description", content: "Your connections and pending requests." },
      { property: "og:title", content: "Connections — Birthday Twin" },
      { property: "og:description", content: "People you've connected with on Birthday Twin." },
    ],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["connections", me?.id], queryFn: () => fetchConnectionsOf(me!.id), enabled: !!me });
  const requests = useQuery({ queryKey: ["requests", me?.id], queryFn: () => fetchRequests(me!.id), enabled: !!me });
  const incoming = requests.data?.filter((r) => r.incoming) ?? [];
  const outgoing = requests.data?.filter((r) => !r.incoming) ?? [];

  async function accept(id: string) {
    const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", id);
    if (error) return void toast.error("Couldn't accept");
    toast.success("Connected · +10 XP");
    qc.invalidateQueries();
  }
  async function remove(id: string, msg: string) {
    const { error } = await supabase.from("connections").delete().eq("id", id);
    if (error) return void toast.error("Something went wrong");
    toast(msg);
    qc.invalidateQueries();
  }

  return (
    <AppShell title="Connections">
      <p className="mb-4 text-sm text-muted-foreground">Connecting is optional — you can explore and join your community without it.</p>
      <Tabs defaultValue={incoming.length ? "requests" : "connected"}>
        <TabsList className="grid w-full grid-cols-3 rounded-full">
          <TabsTrigger value="connected" className="rounded-full">Connected</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full">Requests {incoming.length ? `(${incoming.length})` : ""}</TabsTrigger>
          <TabsTrigger value="sent" className="rounded-full">Sent</TabsTrigger>
        </TabsList>
        <TabsContent value="connected" className="mt-4 space-y-2">
          {list.isLoading && <Skeleton className="h-20 rounded-3xl" />}
          {list.data?.map(({ profile, connectionId }) => (
            <Row key={profile.id} p={profile}>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => remove(connectionId, "Connection removed")}>Remove</Button>
            </Row>
          ))}
          {list.data?.length === 0 && <EmptyState emoji="🤝" title="No connections yet" description="Visit a Birthday Twin's profile and tap Connect." />}
        </TabsContent>
        <TabsContent value="requests" className="mt-4 space-y-2">
          {incoming.map((r) => (
            <Row key={r.id} p={r.profile}>
              <Button size="sm" className="rounded-full" onClick={() => accept(r.id)}>Accept</Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => remove(r.id, "Request declined")}>Decline</Button>
            </Row>
          ))}
          {requests.data && incoming.length === 0 && <EmptyState emoji="📭" title="No requests" description="When a twin wants to connect, it'll show up here." />}
        </TabsContent>
        <TabsContent value="sent" className="mt-4 space-y-2">
          {outgoing.map((r) => (
            <Row key={r.id} p={r.profile}>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => remove(r.id, "Request cancelled")}>Cancel</Button>
            </Row>
          ))}
          {requests.data && outgoing.length === 0 && <EmptyState emoji="✉️" title="No pending requests" description="Requests you send will wait here until accepted." />}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Row({ p, children }: { p: Profile; children: React.ReactNode }) {
  return (
    <div className="panel flex items-center gap-3 p-3">
      <Link to="/u/$username" params={{ username: p.username }} className="flex min-w-0 flex-1 items-center gap-3">
        <img src={p.avatar_url ?? ""} alt="" className="size-11 rounded-2xl bg-surface object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{p.first_name}</p>
          <p className="truncate text-xs text-muted-foreground">🎂 {monthDayLabel(p.birth_month, p.birth_day)} · {flagFor(p.country_code)} {p.city ?? p.country ?? ""}</p>
        </div>
      </Link>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}
