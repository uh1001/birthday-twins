import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Flag, MessageCircle, MoreHorizontal, ShieldOff, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ProfileView } from "@/components/ProfileView";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchConnectionState, fetchProfileByUsername, reportContent } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Profile — Birthday Twin" },
      { name: "description", content: "Meet a Birthday Twin." },
      { property: "og:title", content: "Profile — Birthday Twin" },
      { property: "og:description", content: "Meet someone who shares a birthday." },
    ],
  }),
  component: UserPage,
});

function UserPage() {
  const { username } = Route.useParams();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile", username], queryFn: () => fetchProfileByUsername(username) });
  const p = profile.data;
  const conn = useQuery({ queryKey: ["conn-state", me?.id, p?.id], queryFn: () => fetchConnectionState(me!.id, p!.id), enabled: !!me && !!p && me.id !== p.id });
  const canMsg = useQuery({
    queryKey: ["can-message", p?.id],
    enabled: !!p && !!me && me.id !== p.id,
    queryFn: async () => (await supabase.rpc("can_message", { target: p!.id })).data ?? false,
  });
  const state = conn.data?.state ?? "none";
  const canView = !p?.is_private || state === "connected" || me?.id === p?.id;

  async function connectAction() {
    if (!me || !p) return;
    let error;
    if (state === "none") {
      ({ error } = await supabase.from("connections").insert({ follower_id: me.id, following_id: p.id }));
      if (!error) toast.success(`Request sent to ${p.first_name}`);
    } else if (state === "incoming") {
      ({ error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", conn.data!.id!));
      if (!error) toast.success(`Connected with ${p.first_name} · +10 XP`);
    } else {
      if (state === "connected" && !window.confirm(`Remove your connection with ${p.first_name}?`)) return;
      ({ error } = await supabase.from("connections").delete().eq("id", conn.data!.id!));
      if (!error) toast(state === "connected" ? "Connection removed" : "Request cancelled");
    }
    if (error) toast.error("Something went wrong");
    qc.invalidateQueries();
  }

  async function block() {
    if (!me || !p) return;
    if (!window.confirm(`Block ${p.first_name}? You won't see each other or be able to message.`)) return;
    if (conn.data?.id) await supabase.from("connections").delete().eq("id", conn.data.id);
    const { error } = await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: p.id });
    if (error) return toast.error("Couldn't block");
    toast(`${p.first_name} is blocked`);
    qc.invalidateQueries();
    navigate({ to: "/home" });
  }

  async function report() {
    if (!me || !p) return;
    const reason = window.prompt("Tell us briefly what's wrong")?.trim();
    if (!reason) return;
    const { error } = await reportContent({ reporterId: me.id, reportedId: p.id, reason });
    if (error) return toast.error("Couldn't send report");
    toast.success("Thanks — a moderator will review this");
  }

  const label = { none: <><UserPlus className="size-4" /> Connect</>, outgoing: <><Clock className="size-4" /> Requested</>, incoming: <><UserCheck className="size-4" /> Accept request</>, connected: <><UserCheck className="size-4" /> Connected</> }[state];

  return (
    <AppShell>
      {profile.isLoading && <Skeleton className="h-96 rounded-3xl" />}
      {profile.data === null && <EmptyState emoji="🔎" title="Profile not found" description="This person may have left Birthday Twin, or isn't available." />}
      {p && (
        <ProfileView
          profile={p}
          me={me}
          canView={canView}
          actions={
            me?.id === p.id ? (
              <Link to="/me"><Button className="rounded-full">Edit profile</Button></Link>
            ) : (
              <>
                <Button onClick={connectAction} variant={state === "connected" || state === "outgoing" ? "outline" : "default"} className="rounded-full">{label}</Button>
                {canMsg.data ? (
                  <Link to="/messages/$id" params={{ id: p.id }}>
                    <Button variant="outline" className="rounded-full"><MessageCircle className="size-4" /> Message</Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="rounded-full" disabled title="This person limits who can message them"><MessageCircle className="size-4" /> Messages off</Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="rounded-full" aria-label="More"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={block}><ShieldOff className="size-4" /> Block</DropdownMenuItem>
                    <DropdownMenuItem onClick={report}><Flag className="size-4" /> Report</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          }
        />
      )}
    </AppShell>
  );
}
