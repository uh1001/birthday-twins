import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BirthdayCard } from "@/components/BirthdayCard";
import { DemoBadge } from "@/components/DemoBadge";
import { EmptyState } from "@/components/EmptyState";
import { FeedList } from "@/components/FeedList";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFeed, fetchJourney, fetchXpEvents, type Profile } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { ageFrom, clockTime, flagFor, isBirthdayTwin, monthDayLabel, timeAgo } from "@/lib/birthday";
import { earnedBadges, xpRank } from "@/lib/xp";
import { useYearTwinIds } from "@/hooks/useMyProfile";

export function ProfileView({ profile, me, actions, canView = true }: { profile: Profile; me?: Profile | null | undefined; actions?: ReactNode; canView?: boolean }) {
  const isSelf = me?.id === profile.id;
  const yearIds = useYearTwinIds();
  const connections = useQuery({
    queryKey: ["connection-count", profile.id],
    queryFn: async () =>
      (await supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`follower_id.eq.${profile.id},following_id.eq.${profile.id}`)).count ?? 0,
  });
  const xp = useQuery({ queryKey: ["xp-events", profile.id], queryFn: () => fetchXpEvents(profile.id) });
  const age = profile.show_age || isSelf ? ageFrom(profile.birth_year, profile.birth_month, profile.birth_day) : null;
  const twin = !isSelf && !!me && isBirthdayTwin(me, profile);
  const yearTwin = !isSelf && yearIds.has(profile.id);
  const rank = xpRank(profile.xp);
  const hidden = !canView && !isSelf;
  const badges = earnedBadges(xp.data ?? []);
  const contributions = (xp.data ?? []).filter((e) => ["share", "answer", "challenge", "comment", "event"].includes(e.action)).length;

  return (
    <div className="animate-rise">
      <div className="flex flex-col items-center text-center">
        <img src={profile.avatar_url ?? ""} alt={profile.first_name} className="size-24 rounded-[2rem] bg-surface object-cover shadow-lift" />
        <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold">
          {profile.first_name}{age ? <span className="font-normal text-muted-foreground">, {age}</span> : null}
          {profile.is_demo && <DemoBadge />}
        </h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {(profile.city || profile.country) && (!hidden || isSelf) && (
          <p className="mt-1 text-sm text-muted-foreground">{flagFor(profile.country_code)} {[profile.city, profile.country].filter(Boolean).join(", ")}</p>
        )}
        {isSelf && (profile as Profile).show_birth_year && profile.birth_year && <p className="text-xs text-muted-foreground">Born {profile.birth_year} (visible)</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {twin && <Badge className="rounded-full bg-accent text-accent-foreground hover:bg-accent">🎂 Birthday Twin</Badge>}
          {yearTwin && <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">Year Twin · same full birth date</Badge>}
          <Badge variant="outline" className="rounded-full">{rank.name} · {profile.xp} XP</Badge>
        </div>
        {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>

      <div className="mt-6"><BirthdayCard profile={profile} variant={isSelf ? "self" : "twin"} /></div>

      {hidden ? (
        <div className="mt-6"><EmptyState emoji="🔒" title="This profile is private" description="Connect to see their posts and Journey. Their birthday is always visible." /></div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat value={contributions} label="contributions" />
            <Link to={isSelf ? "/connections" : "/u/$username"} params={{ username: profile.username }} className="panel p-3 hover:bg-accent/40">
              <p className="font-display text-lg font-semibold">{connections.data ?? 0}</p><p className="text-xs text-muted-foreground">connections</p>
            </Link>
            <Stat value={badges.length} label="badges" />
          </div>

          <div className="panel mt-4 space-y-3 p-5">
            {profile.birth_month && (
              <Link to="/community" search={{ m: profile.birth_month, d: profile.birth_day ?? undefined }} className="block text-sm font-medium text-primary">
                🎂 Member of the {monthDayLabel(profile.birth_month, profile.birth_day)} community →
              </Link>
            )}
            {profile.occupation && <p className="text-sm font-medium">💼 {profile.occupation}</p>}
            {profile.bio && <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
            {profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{profile.interests.map((i) => <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs">{i}</span>)}</div>
            )}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {badges.map((b) => <span key={b.id} title={b.description} className="rounded-full border border-border px-3 py-1 text-xs">{b.emoji} {b.name}</span>)}
              </div>
            )}
          </div>

          <Tabs defaultValue="posts" className="mt-6">
            <TabsList className="grid w-full grid-cols-4 rounded-full">
              <TabsTrigger value="posts" className="rounded-full">Posts</TabsTrigger>
              <TabsTrigger value="videos" className="rounded-full">Videos</TabsTrigger>
              <TabsTrigger value="journey" className="rounded-full">Journey</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-full">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-4"><ProfileFeed profile={profile} me={me} kind="notJourney" isSelf={isSelf} /></TabsContent>
            <TabsContent value="videos" className="mt-4"><ProfileFeed profile={profile} me={me} media="video" isSelf={isSelf} /></TabsContent>
            <TabsContent value="journey" className="mt-4"><Journey profile={profile} isSelf={isSelf} /></TabsContent>
            <TabsContent value="timeline" className="mt-4"><Timeline profile={profile} /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="panel p-3"><p className="font-display text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function ProfileFeed({ profile, me, kind, media, isSelf }: { profile: Profile; me?: Profile | null; kind?: "notJourney"; media?: "video"; isSelf: boolean }) {
  const q = useQuery({ queryKey: ["feed", "profile", profile.id, kind, media], queryFn: () => fetchFeed({ profileId: profile.id, kind, media, limit: 50 }, me?.id) });
  return (
    <FeedList
      items={q.data}
      isLoading={q.isLoading}
      isError={q.isError}
      me={me}
      empty={{
        emoji: media ? "🎬" : "📍",
        title: media ? "No videos yet" : "No posts yet",
        description: isSelf ? "Share what your life looks like — your twins are curious." : `${profile.first_name} hasn't shared anything here yet.`,
      }}
    />
  );
}

function Journey({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const q = useQuery({ queryKey: ["journey", profile.id], queryFn: () => fetchJourney(profile.id) });
  if (q.isLoading) return <Skeleton className="h-48 rounded-3xl" />;
  if (!q.data?.entries.length)
    return (
      <EmptyState
        emoji="🧭"
        title="No Journey yet"
        description={isSelf ? "Document your day in a few entries — morning, afternoon, evening." : `${profile.first_name} hasn't documented a day yet.`}
        action={isSelf ? <Link to="/create" search={{ kind: "journey" }} className="text-sm font-medium text-primary">Start today's Journey →</Link> : undefined}
      />
    );
  const isToday = q.data.day === new Date().toDateString();
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{isToday ? "Today's Journey" : `Journey · ${new Date(q.data.day!).toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}</p>
      <ol className="relative space-y-4 border-l-2 border-accent pl-5">
        {q.data.entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full bg-primary ring-4 ring-background" />
            <p className="text-xs font-semibold text-primary">{clockTime(e.created_at)}</p>
            <div className="panel mt-1 p-3">
              {e.body && <p className="text-sm leading-relaxed">{e.body}</p>}
              {e.video_url ? <video src={e.video_url} controls playsInline className="mt-2 max-h-72 w-full rounded-xl" />
                : e.image_url ? <img src={e.image_url} alt="" loading="lazy" className="mt-2 max-h-72 w-full rounded-xl object-cover" /> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Timeline({ profile }: { profile: Profile }) {
  const q = useQuery({
    queryKey: ["timeline", profile.id],
    queryFn: async () => {
      const [m, a] = await Promise.all([
        supabase.from("moments").select("id, kind, body, created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(60),
        supabase.from("answers").select("id, body, created_at, daily_questions(question)").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(30),
      ]);
      const items = [
        ...(m.data ?? []).map((x) => ({ id: x.id, at: x.created_at, icon: x.kind === "journey" ? "🧭" : x.kind === "moment" ? "📍" : "📝", title: x.kind === "journey" ? "Journey entry" : x.kind === "moment" ? "Moment" : "Post", body: x.body, link: x.id })),
        ...(a.data ?? []).map((x) => ({ id: x.id, at: x.created_at, icon: "💬", title: `Answered: ${(x.daily_questions as { question: string } | null)?.question ?? "Daily question"}`, body: x.body, link: null as string | null })),
        { id: "joined", at: profile.created_at, icon: "🎂", title: "Joined Birthday Twin", body: "", link: null },
      ];
      return items.sort((x, y) => y.at.localeCompare(x.at));
    },
  });
  if (q.isLoading) return <Skeleton className="h-48 rounded-3xl" />;
  return (
    <div className="panel divide-y divide-border">
      {q.data?.map((i) => {
        const inner = (
          <div className="flex gap-3 p-4">
            <span className="text-lg">{i.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i.title}</p>
              {i.body && <p className="line-clamp-2 text-xs text-muted-foreground">{i.body}</p>}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(i.at)}</span>
          </div>
        );
        return i.link ? <Link key={i.id} to="/p/$id" params={{ id: i.link }} className="block hover:bg-accent/40">{inner}</Link> : <div key={i.id}>{inner}</div>;
      })}
    </div>
  );
}
