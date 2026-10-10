import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchCommunityStats, type Profile } from "@/lib/api";
import { flagFor, formatCount, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/yearbook")({
  head: () => ({
    meta: [
      { title: "Yearbook Recap — Birthday Twin" },
      { name: "description", content: "Shared memories and top contributions from your birthday community this year." },
      { property: "og:title", content: "Yearbook Recap — Birthday Twin" },
      { property: "og:description", content: "A year in the life of your birthday community." },
    ],
  }),
  component: YearbookPage,
});

type Row = { id: string; body: string; image_url: string | null; created_at: string; profiles: Profile; likes: { count: number }[] };

function YearbookPage() {
  const { data: me } = useMyProfile();
  const year = new Date().getFullYear();
  const enabled = !!me?.birth_month && !!me?.birth_day;
  const stats = useQuery({ queryKey: ["community-stats", me?.birth_month, me?.birth_day], queryFn: () => fetchCommunityStats(me!.birth_month!, me!.birth_day!), enabled });
  const data = useQuery({
    queryKey: ["yearbook", me?.birth_month, me?.birth_day, year],
    enabled,
    queryFn: async () => {
      const since = `${year}-01-01`;
      const { data, error } = await supabase
        .from("moments")
        .select("id, body, image_url, created_at, profiles!inner(*), likes(count)")
        .eq("profiles.birth_month", me!.birth_month!)
        .eq("profiles.birth_day", me!.birth_day!)
        .eq("profiles.show_in_yearbook", true)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];
      const memories = [...rows].sort((a, b) => (b.likes[0]?.count ?? 0) - (a.likes[0]?.count ?? 0)).filter((r) => r.image_url).slice(0, 6);
      const byPerson = new Map<string, { profile: Profile; posts: number }>();
      for (const r of rows) {
        const e = byPerson.get(r.profiles.id) ?? { profile: r.profiles, posts: 0 };
        e.posts += 1;
        byPerson.set(r.profiles.id, e);
      }
      const contributors = [...byPerson.values()].sort((a, b) => b.posts - a.posts).slice(0, 8);
      return { total: rows.length, memories, contributors };
    },
  });

  return (
    <AppShell>
      <div className="rounded-3xl gradient-warm p-6 text-primary-foreground shadow-lift">
        <p className="text-xs uppercase tracking-[0.18em] opacity-85">Yearbook Recap · {year}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">🎂 {monthDayLabel(me?.birth_month, me?.birth_day)}</h1>
        <p className="mt-2 text-sm opacity-90">
          {formatCount(data.data?.total ?? 0)} stories shared by {formatCount(stats.data?.total ?? 0)} members in {stats.data?.countries ?? 0} countries.
        </p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Only people who allow it appear here. {me && !me.show_in_yearbook ? "You've opted out — " : "You can opt out in "}
        <Link to="/me" className="text-primary">privacy settings</Link>.
      </p>

      {data.isLoading && <Skeleton className="mt-6 h-64 rounded-3xl" />}
      {data.data && data.data.total === 0 && <div className="mt-6"><EmptyState emoji="📖" title="The yearbook is still blank" description="Share stories this year and they'll appear in your community's recap." /></div>}

      {!!data.data?.memories.length && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-base font-semibold">Shared memories</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.data.memories.map((m) => (
              <Link key={m.id} to="/p/$id" params={{ id: m.id }} className="group relative overflow-hidden rounded-2xl">
                <img src={m.image_url!} alt="" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">{m.profiles.first_name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!data.data?.contributors.length && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-base font-semibold">Top contributors</h2>
          <div className="panel divide-y divide-border">
            {data.data.contributors.map((c, i) => (
              <Link key={c.profile.id} to="/u/$username" params={{ username: c.profile.username }} className="flex items-center gap-3 p-3 hover:bg-accent/40">
                <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <img src={c.profile.avatar_url ?? ""} alt="" className="size-9 rounded-full bg-surface object-cover" />
                <p className="flex-1 truncate text-sm font-medium">{c.profile.first_name} <span className="text-xs text-muted-foreground">{flagFor(c.profile.country_code)}</span></p>
                <span className="text-xs text-muted-foreground">{c.posts} stories</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
