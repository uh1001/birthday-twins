import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ProfileView } from "@/components/ProfileView";
import { ShareCard } from "@/components/ShareCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchTwinStats, fetchXpEvents } from "@/lib/api";
import { ALL_BADGES, earnedBadges, XP_RULES, xpRank } from "@/lib/xp";
import { deleteMyAccount } from "@/lib/account.functions";
import type { TablesUpdate } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My profile — Birthday Twin" },
      { name: "description", content: "Your profile, progress, badges and privacy settings." },
      { property: "og:title", content: "My profile — Birthday Twin" },
      { property: "og:description", content: "Your profile, progress and privacy settings." },
    ],
  }),
  component: MePage,
});

const NOTIF_CATS = [
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "connections", label: "Connection requests" },
  { id: "messages", label: "Messages" },
  { id: "community", label: "Community activity & events" },
  { id: "challenges", label: "Challenges" },
  { id: "birthdays", label: "Birthday celebrations" },
];

function MePage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const xp = useQuery({ queryKey: ["xp-events", me?.id], queryFn: () => fetchXpEvents(me!.id), enabled: !!me });
  const stats = useQuery({ queryKey: ["twin-stats", me?.id], queryFn: () => fetchTwinStats(me!), enabled: !!me });

  async function update(patch: TablesUpdate<"profiles">) {
    if (!me) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", me.id);
    if (error) return void toast.error("Couldn't save");
    toast.success("Saved");
    qc.invalidateQueries();
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAccount() {
    if (!me || !window.confirm("Delete your profile, posts, messages and all activity? This can't be undone.")) return;
    try {
      await deleteMyAccount();
    } catch {
      return void toast.error("Couldn't delete your account");
    }
    toast.success("Your account data was deleted");
    await signOut();
  }

  if (!me) return <AppShell><div /></AppShell>;
  const rank = xpRank(me.xp);
  const pct = rank.next ? ((me.xp - rank.floor) / (rank.next - rank.floor)) * 100 : 100;
  const earned = new Set(earnedBadges(xp.data ?? []).map((b) => b.id));
  const prefs = (me.notification_prefs ?? {}) as Record<string, boolean>;

  return (
    <AppShell>
      <ProfileView
        profile={me}
        me={me}
        actions={<Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/onboarding", search: { edit: true } })}><Pencil className="size-4" /> Edit profile</Button>}
      />

      <section className="panel mt-8 p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-semibold">{rank.name}</p>
          <p className="text-sm text-muted-foreground">{me.xp} XP</p>
        </div>
        <Progress value={pct} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">{rank.next ? `${rank.next - me.xp} XP to the next rank.` : "Top rank reached."}</p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">How XP and ranks work</summary>
          <p className="mt-2 text-xs text-muted-foreground">XP rewards meaningful participation. Points are recorded once per action and daily limits stop repeated activity from adding up endlessly.</p>
          <ul className="mt-2 space-y-1 text-xs">
            {XP_RULES.map((r) => <li key={r.action} className="flex justify-between gap-2"><span>{r.label}</span><span className="text-muted-foreground">+{r.points} · {r.limit}</span></li>)}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Ranks: New arrival → Explorer (120) → Connector (350) → Storyteller (700) → Constellation (1,200).</p>
        </details>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_BADGES.map((b) => (
            <div key={b.id} className={`rounded-2xl border p-3 text-xs ${earned.has(b.id) ? "border-primary/40 bg-accent" : "border-border opacity-50"}`}>
              <p className="text-lg">{b.emoji}</p>
              <p className="font-semibold">{b.name}</p>
              <p className="text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {stats.data && <div className="mt-4"><ShareCard profile={me} stats={stats.data} /></div>}

      <section className="panel mt-4 divide-y divide-border">
        <p className="p-5 font-display text-base font-semibold">Privacy</p>
        <Row label="Show my age" hint="Displays your age on your profile." checked={me.show_age} onChange={(v) => update({ show_age: v })} />
        <Row label="Show my birth year" hint="Off by default. Year Twins are still matched privately." checked={me.show_birth_year} onChange={(v) => update({ show_birth_year: v })} />
        <Row label="Show my location" hint="City and country only — never an exact address." checked={me.show_location} onChange={(v) => update({ show_location: v })} />
        <Row label="Private profile" hint="Only connections see your posts and Journey." checked={me.is_private} onChange={(v) => update({ is_private: v })} />
        <Row label="Appear in Yearbook Recap" hint="Include your stories in your community's recap." checked={me.show_in_yearbook} onChange={(v) => update({ show_in_yearbook: v })} />
        <div className="flex items-center justify-between gap-4 p-5">
          <div><p className="text-sm font-medium">Who can message me</p><p className="text-xs text-muted-foreground">Messaging is always optional.</p></div>
          <select
            value={me.allow_messages ? me.message_permission : "nobody"}
            onChange={(e) => update({ message_permission: e.target.value, allow_messages: e.target.value !== "nobody" })}
            className="h-9 rounded-full border border-input bg-background px-3 text-sm"
          >
            <option value="everyone">Everyone</option>
            <option value="connections">Connections only</option>
            <option value="nobody">No one</option>
          </select>
        </div>
      </section>

      <section className="panel mt-4 divide-y divide-border">
        <p className="p-5 font-display text-base font-semibold">Notifications</p>
        {NOTIF_CATS.map((c) => (
          <Row key={c.id} label={c.label} hint="" checked={prefs[c.id] !== false} onChange={(v) => update({ notification_prefs: { ...prefs, [c.id]: v } })} />
        ))}
      </section>

      <div className="mt-4 flex flex-col gap-2">
        <Link to="/connections"><Button variant="outline" className="w-full rounded-full">Connections</Button></Link>
        <Link to="/saved"><Button variant="outline" className="w-full rounded-full">Saved posts</Button></Link>
        <Button variant="outline" onClick={signOut} className="rounded-full"><LogOut className="size-4" /> Sign out</Button>
        <Button variant="ghost" onClick={deleteAccount} className="rounded-full text-destructive hover:text-destructive"><Trash2 className="size-4" /> Delete account</Button>
      </div>
    </AppShell>
  );
}

function Row({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
