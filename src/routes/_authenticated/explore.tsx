import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { FeedList } from "@/components/FeedList";
import { TwinCard } from "@/components/TwinCard";
import { WorldMap } from "@/components/WorldMap";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile, useYearTwinIds } from "@/hooks/useMyProfile";
import { fetchFeed, fetchTwinStats, fetchTwins } from "@/lib/api";
import { ageFrom, daysInMonthForBirthday, flagFor, MONTHS, monthDayLabel } from "@/lib/birthday";
import { fetchCelebrities } from "@/lib/celebrities";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Birthday Twin" },
      { name: "description", content: "Discover Birthday Twins, Year Twins, communities, posts, videos and a world map." },
      { property: "og:title", content: "Explore — Birthday Twin" },
      { property: "og:description", content: "Discover people who share your birthday around the world." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { data: me } = useMyProfile();
  return (
    <AppShell title="Explore">
      <Tabs defaultValue="people">
        <TabsList className="grid w-full grid-cols-5 rounded-full">
          <TabsTrigger value="people" className="rounded-full text-xs sm:text-sm">People</TabsTrigger>
          <TabsTrigger value="map" className="rounded-full text-xs sm:text-sm">Map</TabsTrigger>
          <TabsTrigger value="communities" className="rounded-full text-xs sm:text-sm">Days</TabsTrigger>
          <TabsTrigger value="posts" className="rounded-full text-xs sm:text-sm">Posts</TabsTrigger>
          <TabsTrigger value="videos" className="rounded-full text-xs sm:text-sm">Videos</TabsTrigger>
        </TabsList>
        {me && (
          <>
            <TabsContent value="people" className="mt-4"><People /></TabsContent>
            <TabsContent value="map" className="mt-4"><MapTab /></TabsContent>
            <TabsContent value="communities" className="mt-4"><Communities /></TabsContent>
            <TabsContent value="posts" className="mt-4"><PostsTab media={undefined} /></TabsContent>
            <TabsContent value="videos" className="mt-4"><PostsTab media="video" /></TabsContent>
          </>
        )}
      </Tabs>
    </AppShell>
  );
}

function People() {
  const { data: me } = useMyProfile();
  const yearIds = useYearTwinIds();
  const [q, setQ] = useState("");
  const [match, setMatch] = useState<"twins" | "year" | "everyone">("twins");
  const [interest, setInterest] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("all");
  const twins = useQuery({ queryKey: ["twins", me?.id, "all"], queryFn: () => fetchTwins(me!, 300), enabled: !!me });
  const term = q.trim().replace(/[%,()]/g, "");
  const everyone = useQuery({
    queryKey: ["search", term, interest, country],
    enabled: match === "everyone",
    queryFn: async () => {
      let qb = supabase.from("profiles").select("*").eq("onboarded", true).neq("id", me!.id).limit(48);
      if (term.length >= 2) qb = qb.or(`first_name.ilike.%${term}%,username.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%,occupation.ilike.%${term}%`);
      if (interest) qb = qb.contains("interests", [interest]);
      if (country) qb = qb.eq("country", country);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });
  const celebs = useQuery({
    queryKey: ["celebs", me?.birth_month, me?.birth_day],
    enabled: !!me?.birth_month && !!me?.birth_day,
    queryFn: () => fetchCelebrities(me!.birth_month!, me!.birth_day!),
    staleTime: 86400000,
    retry: 1,
  });

  const base = match === "everyone" ? everyone.data ?? [] : (twins.data ?? []).filter((t) => match === "twins" || yearIds.has(t.id));
  const list = base.filter((p) => {
    if (match !== "everyone") {
      if (term.length >= 2 && ![p.first_name, p.username, p.city, p.country, p.occupation].some((v) => v?.toLowerCase().includes(term.toLowerCase()))) return false;
      if (interest && !p.interests.includes(interest)) return false;
      if (country && p.country !== country) return false;
    }
    if (age !== "all") {
      const a = p.show_age ? ageFrom(p.birth_year, p.birth_month, p.birth_day) : null;
      if (a === null) return false;
      const [lo = 0, hi = 200] = age.split("-").map(Number);
      if (a < lo || a > hi) return false;
    }
    return true;
  });
  const allInterests = [...new Set((twins.data ?? []).flatMap((t) => t.interests))].sort();
  const allCountries = [...new Set((twins.data ?? []).map((t) => t.country).filter(Boolean) as string[])].sort();
  const loading = match === "everyone" ? everyone.isLoading : twins.isLoading;

  return (
    <>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, cities, jobs…" className="h-12 rounded-full pl-11" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {([["twins", "🎂 Birthday Twins"], ["year", "✨ Year Twins"], ["everyone", "🌍 Everyone"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMatch(id)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", match === id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{label}</button>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <select value={interest} onChange={(e) => setInterest(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" aria-label="Interest">
          <option value="">Any interest</option>
          {allInterests.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" aria-label="Country">
          <option value="">Any country</option>
          {allCountries.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={age} onChange={(e) => setAge(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" aria-label="Age">
          <option value="all">Any age</option>
          <option value="13-24">Under 25</option>
          <option value="25-34">25–34</option>
          <option value="35-44">35–44</option>
          <option value="45-120">45+</option>
        </select>
      </div>
      {match === "year" && !me?.birth_year && (
        <p className="mt-3 rounded-2xl bg-surface p-3 text-xs text-muted-foreground">Add your birth year (kept private) in <Link to="/onboarding" search={{ edit: true }} className="text-primary">Edit profile</Link> to find Year Twins.</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        {list.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}
      </div>
      {!loading && list.length === 0 && (
        <div className="mt-3">
          <EmptyState emoji="🔎" title={match === "year" ? "No Year Twins yet" : "No matches"} description={match === "year" ? "Nobody with your exact birth date has joined yet — they might soon." : "Try clearing a filter or searching everyone."} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-1 font-display text-base font-semibold">Famous people born on {monthDayLabel(me?.birth_month, me?.birth_day)}</h2>
        <p className="mb-3 text-xs text-muted-foreground">Public figures from Wikipedia — not Birthday Twin members.</p>
        {celebs.isLoading && <Skeleton className="h-24 rounded-3xl" />}
        {celebs.isError && <p className="text-sm text-muted-foreground">Celebrity matches are unavailable right now.</p>}
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {celebs.data?.map((c) => (
            <a key={c.name} href={c.url} target="_blank" rel="noreferrer" className="panel w-40 shrink-0 p-3">
              <img src={c.image} alt={c.name} className="aspect-square w-full rounded-xl bg-surface object-cover" loading="lazy" />
              <p className="mt-2 line-clamp-1 text-sm font-semibold">{c.name}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{c.known_for}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Public figure · {c.year}</p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function MapTab() {
  const { data: me } = useMyProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const stats = useQuery({ queryKey: ["twin-stats", me?.id], queryFn: () => fetchTwinStats(me!), enabled: !!me });
  const twins = useQuery({ queryKey: ["twins", me?.id, "all"], queryFn: () => fetchTwins(me!, 300), enabled: !!me });
  const inCountry = (twins.data ?? []).filter((t) => t.country === selected);
  return (
    <>
      <h2 className="font-display text-base font-semibold">Your Birthday Twins around the world</h2>
      <p className="mb-3 text-xs text-muted-foreground">Approximate country locations only — from people who chose to share where they live. Tap a dot.</p>
      {stats.isLoading ? <Skeleton className="aspect-[2/1] rounded-2xl" /> : <WorldMap points={stats.data?.byCountry ?? []} selected={selected} onSelect={setSelected} />}
      <div className="mt-3 flex flex-wrap gap-2">
        {stats.data?.byCountry.map((c) => (
          <button key={c.country} onClick={() => setSelected(c.country === selected ? null : c.country)} className={cn("rounded-full border px-3 py-1.5 text-xs", selected === c.country ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
            {flagFor(c.code)} {c.country} · {c.count}
          </button>
        ))}
      </div>
      {stats.data && stats.data.byCountry.length === 0 && <div className="mt-3"><EmptyState emoji="🗺️" title="No locations shared yet" description="As twins join and share their country, they'll appear here." /></div>}
      {selected && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Birthday Twins in {selected}</h3>
          <div className="grid gap-3 sm:grid-cols-2">{inCountry.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}</div>
          {inCountry.length === 0 && <p className="text-sm text-muted-foreground">Their profiles are private.</p>}
        </div>
      )}
    </>
  );
}

function Communities() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const counts = useQuery({
    queryKey: ["community-counts", month],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("birth_day").eq("birth_month", month).limit(5000);
      const c: Record<number, number> = {};
      for (const r of data ?? []) if (r.birth_day) c[r.birth_day] = (c[r.birth_day] ?? 0) + 1;
      return c;
    },
  });
  const today = new Date();
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Every birthday has its own community. Peek into any day of the year.</p>
      <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="mb-3 h-10 rounded-full border border-input bg-background px-4 text-sm" aria-label="Month">
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {Array.from({ length: daysInMonthForBirthday(month) }, (_, i) => i + 1).map((d) => {
          const isToday = today.getMonth() + 1 === month && today.getDate() === d;
          return (
            <Link key={d} to="/community" search={{ m: month, d }} className={cn("panel p-2 text-center transition-all hover:shadow-lift", isToday && "ring-2 ring-primary")}>
              <p className="font-display text-lg font-semibold">{d}</p>
              <p className="text-[10px] text-muted-foreground">{counts.data?.[d] ?? 0} members</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function PostsTab({ media }: { media?: "video" }) {
  const { data: me } = useMyProfile();
  const [q, setQ] = useState("");
  const term = q.trim();
  const feed = useQuery({
    queryKey: ["feed", "explore", media, term],
    queryFn: () => fetchFeed({ kind: media ? undefined : "notJourney", media, search: term.length >= 2 ? term : undefined, limit: 30 }, me?.id),
  });
  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={media ? "Search videos…" : "Search posts…"} className="h-11 rounded-full pl-11" />
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Stories from every birthday community around the world.</p>
      <FeedList items={feed.data} isLoading={feed.isLoading} isError={feed.isError} me={me} empty={{ emoji: media ? "🎬" : "📝", title: "Nothing found", description: "Try a different search." }} />
    </>
  );
}
