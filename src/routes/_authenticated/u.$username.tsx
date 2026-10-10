import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, MessageCircle, MoreHorizontal, ShieldOff, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ProfileView } from "@/components/ProfileView";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { awardXp, fetchConnections, fetchProfileByUsername, notifySelf } from "@/lib/api";

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
  const following = useQuery({ queryKey: ["following", me?.id], queryFn: () => fetchConnections(me!.id), enabled: !!me });
  const p = profile.data;
  const connected = !!p && !!following.data?.includes(p.id);

  async function toggleConnect() {
    if (!me || !p) return;
    if (connected) {
      await supabase.from("connections").delete().eq("follower_id", me.id).eq("following_id", p.id);
      toast("Connection removed");
    } else {
      const { error } = await supabase.from("connections").insert({ follower_id: me.id, following_id: p.id });
      if (error) { toast.error("Couldn't connect"); return; }
      await awardXp(me, 10);
      await notifySelf(me.id, "connection", `You connected with ${p.first_name}`, "Say hello and ask about their day.", p.id);
      toast.success(`Connected with ${p.first_name} · +10 XP`);
    }
    qc.invalidateQueries();
  }

  async function block() {
    if (!me || !p) return;
    await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: p.id });
    await supabase.from("connections").delete().eq("follower_id", me.id).eq("following_id", p.id);
    toast(`${p.first_name} is blocked`);
    navigate({ to: "/home" });
  }

  async function report() {
    if (!me || !p) return;
    const reason = window.prompt("Tell us briefly what's wrong")?.trim();
    if (!reason) return;
    await supabase.from("reports").insert({ reporter_id: me.id, reported_id: p.id, reason: reason.slice(0, 500) });
    toast.success("Thanks — our team will review this");
  }

  return (
    <AppShell>
      {profile.isLoading && <Skeleton className="h-96 rounded-3xl" />}
      {profile.data === null && <EmptyState emoji="🔎" title="Profile not found" description="This person may have left Birthday Twin." />}
      {p && (
        <ProfileView
          profile={p}
          me={me}
          actions={
            me?.id === p.id ? (
              <Link to="/me"><Button className="rounded-full">Edit profile</Button></Link>
            ) : (
              <>
                <Button onClick={toggleConnect} variant={connected ? "outline" : "default"} className="rounded-full">
                  {connected ? <><UserCheck className="size-4" /> Connected</> : <><UserPlus className="size-4" /> Connect</>}
                </Button>
                <Link to="/messages/$id" params={{ id: p.id }}>
                  <Button variant="outline" className="rounded-full" disabled={!p.allow_messages}><MessageCircle className="size-4" /> Message</Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
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
