import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BirthdayCard } from "@/components/BirthdayCard";
import { EmptyState } from "@/components/EmptyState";
import { MomentCard } from "@/components/MomentCard";
import { Badge } from "@/components/ui/badge";
import { fetchMoments, xpRank, type Profile } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { ageFrom, flagFor } from "@/lib/birthday";

export function ProfileView({ profile, me, actions }: { profile: Profile; me?: Profile | null; actions?: ReactNode }) {
  const moments = useQuery({ queryKey: ["moments", profile.id], queryFn: () => fetchMoments(profile.id) });
  const connections = useQuery({
    queryKey: ["connection-count", profile.id],
    queryFn: async () => (await supabase.from("connections").select("id", { count: "exact", head: true }).eq("following_id", profile.id)).count ?? 0,
  });
  const isSelf = me?.id === profile.id;
  const age = profile.show_age || isSelf ? ageFrom(profile.birth_year, profile.birth_month, profile.birth_day) : null;
  const twin = !isSelf && me?.birth_month === profile.birth_month && me?.birth_day === profile.birth_day;
  const yearTwin = twin && !!me?.birth_year && me.birth_year === profile.birth_year;
  const rank = xpRank(profile.xp);
  const hidden = profile.is_private && !isSelf;

  return (
    <div className="animate-rise">
      <div className="flex flex-col items-center text-center">
        <img src={profile.avatar_url ?? ""} alt={profile.first_name} className="size-24 rounded-[2rem] object-cover shadow-lift" />
        <h1 className="mt-4 font-display text-2xl font-semibold">{profile.first_name}{age ? <span className="font-normal text-muted-foreground">, {age}</span> : null}</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {!hidden && (profile.city || profile.country) && <p className="mt-1 text-sm text-muted-foreground">{flagFor(profile.country_code)} {[profile.city, profile.country].filter(Boolean).join(", ")}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {twin && <Badge className="rounded-full bg-accent text-accent-foreground hover:bg-accent">🎂 Birthday Twin</Badge>}
          {yearTwin && <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">Year Twin</Badge>}
          <Badge variant="outline" className="rounded-full">{rank.name} · {profile.xp} XP</Badge>
        </div>
        {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>

      <div className="mt-6"><BirthdayCard profile={profile} variant={isSelf ? "self" : "twin"} /></div>

      {hidden ? (
        <div className="mt-6"><EmptyState emoji="🔒" title="This profile is private" description="Only their birthday is visible." /></div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="panel p-3"><p className="font-display text-lg font-semibold">{moments.data?.length ?? 0}</p><p className="text-xs text-muted-foreground">moments</p></div>
            <div className="panel p-3"><p className="font-display text-lg font-semibold">{connections.data ?? 0}</p><p className="text-xs text-muted-foreground">connections</p></div>
            <div className="panel p-3"><p className="font-display text-lg font-semibold">{profile.interests.length}</p><p className="text-xs text-muted-foreground">interests</p></div>
          </div>
          <div className="panel mt-4 space-y-3 p-5">
            {profile.occupation && <p className="text-sm font-medium">💼 {profile.occupation}</p>}
            {profile.bio && <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
            {profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{profile.interests.map((i) => <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs">{i}</span>)}</div>
            )}
          </div>
          <h2 className="mb-3 mt-8 font-display text-base font-semibold">Moments</h2>
          <div className="space-y-3">
            {moments.data?.map((m) => <MomentCard key={m.id} moment={m} me={me} />)}
            {moments.data?.length === 0 && <EmptyState emoji="📍" title="No Moments yet." description={isSelf ? "Share what your day looks like — your twins are curious." : `${profile.first_name} hasn't shared a Moment yet.`} />}
          </div>
        </>
      )}
    </div>
  );
}
