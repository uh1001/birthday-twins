import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/Composer";
import { EmptyState } from "@/components/EmptyState";
import { FeedList } from "@/components/FeedList";
import { TwinCard } from "@/components/TwinCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { communityIds, fetchAnswers, fetchCommunityMembers, fetchCommunityStats, fetchFeed, fetchTodaysQuestion } from "@/lib/api";
import { ageFrom, daysInMonthForBirthday, flagFor, formatCount, MONTHS, monthDayLabel } from "@/lib/birthday";
import { xpRank } from "@/lib/xp";

const TABS = ["feed", "photos", "videos", "people", "question", "challenges", "leaderboard", "events"] as const;

export const Route = createFileRoute("/_authenticated/community")({
  validateSearch: z.object({
    m: z.number().int().min(1).max(12).optional(),
    d: z.number().int().min(1).max(31).optional(),
    tab: z.enum(TABS).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Birthday Communities — Birthday Twin" },
      { name: "description", content: "Feed, photos, videos, people, leaderboard and events for every birthday." },
      { property: "og:title", content: "Birthday Communities — Birthday Twin" },
      { property: "og:description", content: "Everyone who shares a birthday, in one place." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { data: me } = useMyProfile();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const month = search.m ?? me?.birth_month ?? null;
  const day = search.d ?? me?.birth_day ?? null;
  const isMine = !!me && month === me.birth_month && day === me.birth_day;
  const tab = search.tab ?? "feed";
  const ready = !!me && !!month && !!day;

  const stats = useQuery({ queryKey: ["community-stats", month, day], queryFn: () => fetchCommunityStats(month!, day!), enabled: ready });

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl gradient-warm p-6 text-primary-foreground shadow-lift">
        <p className="text-xs uppercase tracking-[0.18em] opacity-85">{isMine ? "Your Birthday Community" : "Birthday Community"}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">🎂 {monthDayLabel(month, day)}</h1>
        <p className="mt-2 text-sm opacity-90">🌎 {formatCount(stats.data?.total ?? 0)} members in {stats.data?.countries ?? 0} countries</p>
        {isMine && <p className="mt-1 text-xs opacity-85">You're automatically a member because this is your birthday.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Month" value={month ?? ""} onChange={(e) => navigate({ search: { m: Number(e.target.value), d: Math.min(day ?? 1, daysInMonthForBirthday(Number(e.target.value))), tab } })} className="h-9 rounded-full border border-input bg-background px-3 text-sm">
          {MONTHS.map((mn, i) => <option key={mn} value={i + 1}>{mn}</option>)}
        </select>
        <select aria-label="Day" value={day ?? ""} onChange={(e) => navigate({ search: { m: month ?? 1, d: Number(e.target.value), tab } })} className="h-9 rounded-full border border-input bg-background px-3 text-sm">
          {Array.from({ length: daysInMonthForBirthday(month ?? 1) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {!isMine && me?.birth_month && <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate({ search: {} })}>Back to my community</Button>}
        {isMine && <Link to="/yearbook" className="ml-auto text-xs font-medium text-primary">Yearbook Recap →</Link>}
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { m: search.m, d: search.d, tab: v as (typeof TABS)[number] } })} className="mt-4">
        <div className="-mx-4 overflow-x-auto px-4">
          <TabsList className="inline-flex w-max rounded-full">
            {TABS.map((t) => <TabsTrigger key={t} value={t} className="rounded-full capitalize">{t}</TabsTrigger>)}
          </TabsList>
        </div>
        {ready && (
          <>
            <TabsContent value="feed" className="mt-4 space-y-3">
              {isMine && me && <Composer me={me} />}
              <CommunityFeed month={month!} day={day!} meId={me!.id} kind="notJourney" empty="No posts yet. Your Birthday Twins are probably doing something interesting right now. Be the first to share yours." />
            </TabsContent>
            <TabsContent value="photos" className="mt-4"><MediaGrid month={month!} day={day!} media="image" /></TabsContent>
            <TabsContent value="videos" className="mt-4"><CommunityFeed month={month!} day={day!} meId={me!.id} media="video" empty="No videos yet. Share a short clip of your day." /></TabsContent>
            <TabsContent value="people" className="mt-4"><People month={month!} day={day!} countries={stats.data?.byCountry ?? []} /></TabsContent>
            <TabsContent value="question" className="mt-4"><Question month={month!} day={day!} canAnswer={isMine} /></TabsContent>
            <TabsContent value="challenges" className="mt-4"><Challenges month={month!} day={day!} /></TabsContent>
            <TabsContent value="leaderboard" className="mt-4"><Leaderboard month={month!} day={day!} /></TabsContent>
            <TabsContent value="events" className="mt-4"><Events month={month!} day={day!} canCreate={isMine} /></TabsContent>
          </>
        )}
      </Tabs>
    </AppShell>
  );
}

function CommunityFeed({ month, day, meId, kind, media, empty }: { month: number; day: number; meId: string; kind?: "notJourney"; media?: "video"; empty: string }) {
  const { data: me } = useMyProfile();
  const q = useQuery({ queryKey: ["feed", "community", month, day, kind, media], queryFn: () => fetchFeed({ month, day, kind, media, limit: 40 }, meId) });
  return <FeedList items={q.data} isLoading={q.isLoading} isError={q.isError} me={me} empty={{ emoji: "📍", title: "Nothing here yet", description: empty }} />;
}

function MediaGrid({ month, day, media }: { month: number; day: number; media: "image" }) {
  const q = useQuery({ queryKey: ["feed", "grid", month, day, media], queryFn: () => fetchFeed({ month, day, media, limit: 60 }) });
  if (q.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!q.data?.length) return <EmptyState emoji="📷" title="No photos yet" description="Photos your twins share will collect here." />;
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {q.data.map((m) => (
        <Link key={m.id} to="/p/$id" params={{ id: m.id }} className="overflow-hidden rounded-xl">
          <img src={m.image_url!} alt={m.body.slice(0, 60)} loading="lazy" className="aspect-square w-full object-cover transition-transform hover:scale-105" />
        </Link>
      ))}
    </div>
  );
}

function People({ month, day, countries }: { month: number; day: number; countries: { country: string; code: string }[] }) {
  const { data: me } = useMyProfile();
  const [country, setCountry] = useState("all");
  const [age, setAge] = useState("all");
  const [interest, setInterest] = useState("");
  const members = useQuery({ queryKey: ["members", month, day], queryFn: () => fetchCommunityMembers(month, day, 300, me?.id) });
  const years = useMemo(() => {
    const s = new Set<number>();
    for (const p of members.data ?? []) if (p.show_birth_year && p.birth_year) s.add(p.birth_year);
    return [...s].sort((a, b) => b - a);
  }, [members.data]);

  const filtered = (members.data ?? []).filter((p) => {
    if (country !== "all" && p.country !== country) return false;
    if (age.startsWith("y:")) {
      if (!p.show_birth_year || p.birth_year !== Number(age.slice(2))) return false;
    } else if (age !== "all") {
      const a = p.show_age ? ageFrom(p.birth_year, p.birth_month, p.birth_day) : null;
      if (a === null) return false;
      const [lo = 0, hi = 200] = age.split("-").map(Number);
      if (a < lo || a > hi) return false;
    }
    if (interest && !p.interests.some((i) => i.toLowerCase().includes(interest.toLowerCase()))) return false;
    return true;
  });

  return (
    <>
      <div className="panel grid gap-2 p-3 sm:grid-cols-3">
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" aria-label="Country">
          <option value="all">All countries</option>
          {countries.map((c) => <option key={c.country} value={c.country}>{flagFor(c.code)} {c.country}</option>)}
        </select>
        <select value={age} onChange={(e) => setAge(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" aria-label="Age or birth year">
          <option value="all">Any age</option>
          <option value="13-24">Under 25</option>
          <option value="25-34">25–34</option>
          <option value="35-44">35–44</option>
          <option value="45-120">45+</option>
          {years.length > 0 && <optgroup label="Birth year (shared publicly)">{years.map((y) => <option key={y} value={`y:${y}`}>Born {y}</option>)}</optgroup>}
        </select>
        <Input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Interest" className="h-10 rounded-xl" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Age and birth-year filters only include people who choose to show them.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {members.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        {filtered.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}
      </div>
      {members.data && filtered.length === 0 && <div className="mt-3"><EmptyState emoji="🔎" title="No one matches those filters" description="Try a different country, age or interest." /></div>}
    </>
  );
}

function Question({ month, day, canAnswer }: { month: number; day: number; canAnswer: boolean }) {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [answer, setAnswer] = useState("");
  const question = useQuery({ queryKey: ["daily-question"], queryFn: fetchTodaysQuestion });
  const answers = useQuery({ queryKey: ["answers", question.data?.id, month, day], queryFn: () => fetchAnswers(question.data!.id, month, day), enabled: !!question.data });
  const mine = answers.data?.find((a) => a.profile_id === me?.id);

  async function submit() {
    if (!me || !question.data) return;
    const text = answer.trim();
    if (!text || text.length > 500) return void toast.error("Write 1–500 characters");
    const { error } = await supabase.from("answers").insert({ question_id: question.data.id, profile_id: me.id, body: text });
    if (error) return void toast.error(error.message.includes("duplicate") ? "You already answered today" : "Couldn't save answer");
    setAnswer("");
    toast.success("Answer shared · +20 XP");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-3">
      <div className="panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Daily Birthday Question</p>
        <p className="mt-2 font-display text-lg font-semibold">{question.data?.question ?? "Loading…"}</p>
        {canAnswer && !mine && (
          <>
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer… compare notes with your twins" maxLength={500} className="mt-4 min-h-20 rounded-xl" />
            <Button onClick={submit} className="mt-3 w-full rounded-full">Answer · +20 XP</Button>
          </>
        )}
        {mine && <p className="mt-3 rounded-xl bg-accent p-3 text-sm">Your answer: {mine.body}</p>}
      </div>
      {answers.data?.map((a) => (
        <div key={a.id} className="panel p-4">
          <Link to="/u/$username" params={{ username: a.profiles?.username ?? "" }} className="flex items-center gap-2">
            <img src={a.profiles?.avatar_url ?? ""} alt="" className="size-8 rounded-full bg-surface object-cover" />
            <p className="text-sm font-semibold">{a.profiles?.first_name}</p>
            <span className="text-xs text-muted-foreground">{flagFor(a.profiles?.country_code)} {a.profiles?.city}</span>
          </Link>
          <p className="mt-2 text-sm leading-relaxed">{a.body}</p>
        </div>
      ))}
      {answers.data?.length === 0 && <EmptyState emoji="💬" title="No answers yet" description="Be the first of your Birthday Twins to answer today's question." />}
    </div>
  );
}

function Challenges({ month, day }: { month: number; day: number }) {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);
  const q = useQuery({
    queryKey: ["challenges", month, day],
    queryFn: async () => {
      const { data: ch } = await supabase.from("community_challenges").select("*").lte("starts_on", today).gte("ends_on", today).order("ends_on");
      const ids = (ch ?? []).map((c) => c.id);
      const { data: entries } = ids.length
        ? await supabase.from("challenge_entries").select("*, profiles(*)").in("challenge_id", ids).in("profile_id", await communityIds(month, day)).order("created_at", { ascending: false }).limit(200)
        : { data: [] };
      return (ch ?? []).map((c) => ({ ...c, entries: (entries ?? []).filter((e) => e.challenge_id === c.id) }));
    },
  });

  async function enter(id: string) {
    if (!me) return;
    const body = (drafts[id] ?? "").trim();
    if (!body || body.length > 1000) return void toast.error("Write 1–1,000 characters");
    const { error } = await supabase.from("challenge_entries").insert({ challenge_id: id, profile_id: me.id, body });
    if (error) return void toast.error(error.message.includes("duplicate") ? "You already joined this challenge" : "Couldn't submit");
    toast.success("Challenge joined");
    setDrafts((d) => ({ ...d, [id]: "" }));
    qc.invalidateQueries();
  }

  if (q.isLoading) return <Skeleton className="h-48 rounded-3xl" />;
  if (!q.data?.length) return <EmptyState emoji="🏅" title="No active challenges" description="New community challenges arrive regularly." />;
  return (
    <div className="space-y-3">
      {q.data.map((c) => {
        const joined = c.entries.some((e) => e.profile_id === me?.id);
        return (
          <div key={c.id} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">+{c.xp} XP</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Ends {new Date(c.ends_on).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {c.entries.length} entries from this community</p>
            {me && me.birth_month === month && me.birth_day === day && !joined && (
              <div className="mt-3 flex gap-2">
                <Input value={drafts[c.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))} placeholder="Your entry…" maxLength={1000} className="rounded-full" />
                <Button className="rounded-full" onClick={() => enter(c.id)}>Join</Button>
              </div>
            )}
            {joined && <p className="mt-3 text-xs font-medium text-primary">✓ You joined this challenge</p>}
            <div className="mt-3 space-y-2">
              {c.entries.slice(0, 3).map((e) => (
                <p key={e.id} className="rounded-xl bg-surface p-3 text-sm"><span className="font-semibold">{e.profiles?.first_name}:</span> {e.body}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Leaderboard({ month, day }: { month: number; day: number }) {
  const { data: me } = useMyProfile();
  const q = useQuery({ queryKey: ["members", month, day, "top"], queryFn: () => fetchCommunityMembers(month, day, 20) });
  if (q.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!q.data?.length) return <EmptyState emoji="🏆" title="No contributors yet" description="Share stories and answer questions to lead your community." />;
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">Ranked by XP earned from real contributions — sharing stories, answering questions and joining challenges.</p>
      <div className="panel divide-y divide-border">
        {q.data.map((p, i) => (
          <Link key={p.id} to="/u/$username" params={{ username: p.username }} className={`flex items-center gap-3 p-3 hover:bg-accent/40 ${p.id === me?.id ? "bg-accent/50" : ""}`}>
            <span className="w-6 text-center font-display text-sm font-semibold text-muted-foreground">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
            <img src={p.avatar_url ?? ""} alt="" className="size-9 rounded-full bg-surface object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.first_name} <span className="text-xs text-muted-foreground">{flagFor(p.country_code)}</span></p>
              <p className="text-xs text-muted-foreground">{xpRank(p.xp).name}</p>
            </div>
            <span className="text-sm font-semibold">{p.xp} XP</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function Events({ month, day, canCreate }: { month: number; day: number; canCreate: boolean }) {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Online");
  const [when, setWhen] = useState("");
  const q = useQuery({
    queryKey: ["events", month, day],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("*, creator:profiles!community_events_created_by_fkey(first_name, username), event_rsvps(profile_id)")
        .eq("birth_month", month)
        .eq("birth_day", day)
        .gte("starts_at", new Date(Date.now() - 86400000).toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!me) return;
    if (title.trim().length < 3) return void toast.error("Give your event a title");
    if (!when || new Date(when) < new Date()) return void toast.error("Pick a future date and time");
    const { error } = await supabase.from("community_events").insert({
      birth_month: month, birth_day: day, title: title.trim(), description: description.trim() || null,
      location: location.trim() || null, starts_at: new Date(when).toISOString(), created_by: me.id,
    });
    if (error) return void toast.error("Couldn't create event");
    toast.success("Event created — your community has been notified");
    setOpen(false); setTitle(""); setDescription(""); setWhen("");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function rsvp(eventId: string, going: boolean) {
    if (!me) return;
    const { error } = going
      ? await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("profile_id", me.id)
      : await supabase.from("event_rsvps").insert({ event_id: eventId, profile_id: me.id });
    if (error) return void toast.error("Couldn't update RSVP");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function remove(id: string) {
    if (!window.confirm("Cancel this event?")) return;
    const { error } = await supabase.from("community_events").delete().eq("id", id);
    if (error) return void toast.error("Couldn't cancel event");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  return (
    <div className="space-y-3">
      {canCreate && (open ? (
        <div className="panel space-y-2 p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title (e.g. Birthday eve video call)" maxLength={120} className="rounded-xl" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the plan?" maxLength={1000} className="rounded-xl" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Online or city" maxLength={120} className="rounded-xl" />
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={create}>Create event</Button>
          </div>
        </div>
      ) : (
        <Button className="w-full rounded-full" onClick={() => setOpen(true)}>Host an event or shared celebration</Button>
      ))}
      {q.isLoading && <Skeleton className="h-32 rounded-3xl" />}
      {q.data?.length === 0 && <EmptyState emoji="🎈" title="No upcoming events" description="Host a meetup or birthday celebration for your twins." />}
      {q.data?.map((e) => {
        const going = e.event_rsvps.some((r) => r.profile_id === me?.id);
        return (
          <div key={e.id} className="panel p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {new Date(e.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="mt-1 font-display text-base font-semibold">{e.title}</p>
            {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">📍 {e.location ?? "TBA"} · Hosted by {e.creator?.first_name} · {e.event_rsvps.length} going</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant={going ? "outline" : "default"} className="rounded-full" onClick={() => rsvp(e.id, going)}>{going ? "✓ Going" : "I'm going"}</Button>
              {(e.created_by === me?.id || me?.isModerator) && <Button size="sm" variant="ghost" className="rounded-full" onClick={() => remove(e.id)}>Cancel event</Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
