import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { TwinCard } from "@/components/TwinCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchTodaysQuestion, fetchTwinStats, fetchTwins } from "@/lib/api";
import { flagFor, monthDayLabel } from "@/lib/birthday";
import { celebritiesFor } from "@/lib/celebrities";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Birthday Twin" },
      { name: "description", content: "Discover Birthday Twins, Year Twins and people around the world." },
      { property: "og:title", content: "Explore — Birthday Twin" },
      { property: "og:description", content: "Discover people who share your birthday around the world." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { data: me } = useMyProfile();
  const [q, setQ] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const stats = useQuery({ queryKey: ["twin-stats", me?.id], queryFn: () => fetchTwinStats(me!), enabled: !!me });
  const twins = useQuery({ queryKey: ["twins", me?.id, "all"], queryFn: () => fetchTwins(me!, 200), enabled: !!me });
  const question = useQuery({ queryKey: ["daily-question"], queryFn: fetchTodaysQuestion });
  const search = useQuery({
    queryKey: ["search", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const term = q.trim().replace(/[%,()]/g, "");
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_private", false)
        .or(`first_name.ilike.%${term}%,username.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%,occupation.ilike.%${term}%`)
        .limit(24);
      return data ?? [];
    },
  });

  const yearTwins = (twins.data ?? []).filter((t) => me?.birth_year && t.birth_year === me.birth_year);
  const inCountry = (twins.data ?? []).filter((t) => t.country === selectedCountry);
  const celebs = celebritiesFor(me?.birth_month, me?.birth_day);
  const max = Math.max(1, ...(stats.data?.byCountry.map((c) => c.count) ?? [1]));

  return (
    <AppShell title="Explore">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, cities, jobs…" className="h-12 rounded-full pl-11" />
      </div>

      {q.trim().length >= 2 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {search.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}
          {search.data?.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}
          {search.data?.length === 0 && <div className="sm:col-span-2"><EmptyState emoji="🔎" title="No one found" description="Try another name, city or occupation." /></div>}
        </div>
      ) : (
        <>
          <Section title="Your Birthday Twins around the world">
            <div className="panel p-4">
              <p className="text-xs text-muted-foreground">Tap a country. Only city and country are ever shown.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {stats.data?.byCountry.map((c) => (
                  <button
                    key={c.country}
                    onClick={() => setSelectedCountry(c.country === selectedCountry ? null : c.country)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                      selectedCountry === c.country ? "border-primary bg-accent" : "border-border bg-surface hover:border-primary/40",
                    )}
                  >
                    <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${(c.count / max) * 100}%` }} />
                    <p className="relative text-sm font-medium">{flagFor(c.code)} {c.country}</p>
                    <p className="relative text-xs text-muted-foreground">{c.count} twin{c.count === 1 ? "" : "s"}</p>
                  </button>
                ))}
              </div>
            </div>
            {selectedCountry && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {inCountry.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}
              </div>
            )}
          </Section>

          <Section title="Year Twins">
            {me?.birth_year ? (
              yearTwins.length ? (
                <div className="grid gap-3 sm:grid-cols-2">{yearTwins.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}</div>
              ) : (
                <EmptyState emoji="🗓️" title="No Year Twins yet" description="Nobody born on your exact day and year has joined yet." />
              )
            ) : (
              <EmptyState emoji="🗓️" title="Add your birth year" description="Add it privately on your profile to discover Year Twins." />
            )}
          </Section>

          <Section title="Celebrity birthday matches">
            {celebs.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {celebs.map((c) => (
                  <div key={c.name} className="panel flex items-center gap-3 p-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-accent text-xl">⭐</div>
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.known_for} · {monthDayLabel(c.month, c.day)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState emoji="⭐" title="Famous twins coming soon" description="We're growing our list of famous people born on every day of the year." />
            )}
          </Section>

          <Section title="Trending question">
            <div className="panel p-5">
              <p className="font-display text-base font-semibold">{question.data?.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">Answered by Birthday Twins around the world today</p>
            </div>
          </Section>

          <Section title="Interesting profiles">
            <div className="grid gap-3 sm:grid-cols-2">
              {(twins.data ?? []).slice(0, 6).map((p) => <TwinCard key={p.id} profile={p} me={me} />)}
            </div>
          </Section>
        </>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
