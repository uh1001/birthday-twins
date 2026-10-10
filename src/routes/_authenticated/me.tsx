import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ProfileView } from "@/components/ProfileView";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { xpRank, type Profile } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My profile — Birthday Twin" },
      { name: "description", content: "Your profile, progress and privacy settings." },
      { property: "og:title", content: "My profile — Birthday Twin" },
      { property: "og:description", content: "Your profile, progress and privacy settings." },
    ],
  }),
  component: MePage,
});

function MePage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function setFlag(key: keyof Pick<Profile, "show_age" | "is_private" | "allow_messages">, value: boolean) {
    if (!me) return;
    const { error } = await supabase.from("profiles").update({ [key]: value }).eq("id", me.id);
    if (error) return toast.error("Couldn't save");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAccount() {
    if (!me || !window.confirm("Delete your profile, moments and messages? This can't be undone.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", me.id);
    if (error) return toast.error("Couldn't delete your account");
    toast.success("Your account data was deleted");
    await signOut();
  }

  if (!me) return <AppShell><div /></AppShell>;
  const rank = xpRank(me.xp);
  const pct = rank.next ? ((me.xp - rank.floor) / (rank.next - rank.floor)) * 100 : 100;

  return (
    <AppShell>
      <ProfileView
        profile={me}
        me={me}
        actions={<Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/onboarding" })}><Pencil className="size-4" /> Edit</Button>}
      />

      <section className="panel mt-8 p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-semibold">{rank.name}</p>
          <p className="text-sm text-muted-foreground">{me.xp} XP</p>
        </div>
        <Progress value={pct} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {rank.next ? `${rank.next - me.xp} XP to the next rank.` : "Top rank reached."} Earn XP by answering questions (+20), sharing Moments (+15) and connecting (+10).
        </p>
      </section>

      <section className="panel mt-4 divide-y divide-border">
        <p className="p-5 font-display text-base font-semibold">Privacy</p>
        <Row label="Show my age" hint="Your birth year always stays private." checked={me.show_age} onChange={(v) => setFlag("show_age", v)} />
        <Row label="Private profile" hint="Only your name and birthday are visible." checked={me.is_private} onChange={(v) => setFlag("is_private", v)} />
        <Row label="Allow messages" hint="Let Birthday Twins message you." checked={me.allow_messages} onChange={(v) => setFlag("allow_messages", v)} />
      </section>

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="outline" onClick={signOut} className="rounded-full"><LogOut className="size-4" /> Sign out</Button>
        <Button variant="ghost" onClick={deleteAccount} className="rounded-full text-destructive hover:text-destructive"><Trash2 className="size-4" /> Delete account</Button>
      </div>
    </AppShell>
  );
}

function Row({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
