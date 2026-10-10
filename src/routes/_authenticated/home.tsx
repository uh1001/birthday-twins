import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BirthdayCard } from "@/components/BirthdayCard";
import { EmptyState } from "@/components/EmptyState";
import { MomentCard } from "@/components/MomentCard";
import { TwinCard } from "@/components/TwinCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchCommunityJourneys, fetchFeed, fetchTodaysQuestion, fetchTwinStats, fetchTwins } from "@/lib/api";
import { daysUntilBirthday, flagFor, formatCount, greeting, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Birthday Twin" },
      { name: "description", content: "Your Birthday Twins, moments and today's question." },
      { property: "og:title", content: "Home — Birthday Twin" },
      { property: "og:description", content: "Your Birthday Twins, moments and today's question." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useMyProfile();

  const twins = useQuery({
    queryKey: ["twins", me?.id],
    queryFn: () => fetchTwins(me!, 12),
    enabled: !!me,
  });
  const stats = useQuery({
    queryKey: ["twin-stats", me?.id],
    queryFn: () => fetchTwinStats(me!),
    enabled: !!me,
  });
  const moments = useQuery({
    queryKey: ["feed", "home", me?.id],
    queryFn: () => fetchFeed({ month: me!.birth_month, day: me!.birth_day, kind: "notJourney", limit: 15 }, me!.id),
    enabled: !!me,
  });
  const question = useQuery({ queryKey: ["daily-question"], queryFn: fetchTodaysQuestion });

  const days = me ? daysUntilBirthday(me.birth_month, me.birth_day) : null;
  const journeys = useQuery({
    queryKey: ["journeys", me?.birth_month, me?.birth_day],
    queryFn: () => fetchCommunityJourneys(me!.birth_month!, me!.birth_day!, 5),
    enabled: !!me?.birth_month && !!me?.birth_day,
  });
  const journey = journeys.data ?? [];

  return (
    <AppShell>
      <div className="animate-rise">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="font-display text-2xl font-semibold">{me?.first_name ?? "friend"}</h1>
        {days !== null && (
          <p className="mt-1 text-sm text-muted-foreground">
            {days === 0
              ? "It's your birthday today 🎉"
              : `Your birthday is in ${days} day${days === 1 ? "" : "s"}.`}
          </p>
        )}
      </div>

      {me && (
        <div className="mt-4">
          <BirthdayCard profile={me} />
        </div>
      )}

      {stats.data && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat value={formatCount(stats.data.total)} label="birthday twins" />
          <Stat value={String(stats.data.countries)} label="countries" />
          <Stat value={String(stats.data.sameAge)} label="year twins" />
        </div>
      )}

      <Section
        title="Your Birthday Twins"
        action={<Link to="/twins" className="text-xs font-medium text-primary">See all</Link>}
      >
        {twins.isLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-52 shrink-0 rounded-3xl" />
            ))}
          </div>
        ) : twins.data?.length ? (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {twins.data.map((t) => (
              <div key={t.id} className="w-56 shrink-0 snap-start">
                <TwinCard profile={t} me={me} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No twins yet on your date"
            description="You're early to this birthday. Explore other days while your twins arrive."
          />
        )}
      </Section>

      <Section title="Today's Journey" action={<Link to="/create" search={{ kind: "journey" }} className="text-xs font-medium text-primary">Add yours</Link>}>
        <div className="panel divide-y divide-border">
          <div className="p-4">
            <p className="text-sm font-medium">Your Birthday Twins today</p>
            <p className="text-xs text-muted-foreground">
              Same day of birth. Completely different lives.
            </p>
          </div>
          {journey.length ? (
            journey.map(({ profile: t, count, preview }) => (
              <Link
                key={t.id}
                to="/u/$username"
                params={{ username: t.username }}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40"
              >
                <img src={t.avatar_url ?? ""} alt="" className="size-10 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {t.occupation ?? "A twin"}{t.city ? ` in ${t.city}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {flagFor(t.country_code)} {t.first_name} · {count} entries · “{preview.slice(0, 50)}”
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Stories from your twins will appear here.{" "}
              <Link to="/create" search={{ kind: "journey" }} className="text-primary">Start your own Journey →</Link>
            </p>
          )}
        </div>
      </Section>

      <Section title="Daily Birthday Question">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today</p>
          <p className="mt-2 font-display text-lg font-semibold leading-snug">
            {question.data?.question ?? "Loading today's question…"}
          </p>
          <Link to="/community" search={{ tab: "question" }} className="mt-4 block">
            <Button className="w-full rounded-full">Answer with your twins</Button>
          </Link>
        </div>
      </Section>

      <Section
        title="Moments from your Birthday Community"
        action={<Link to="/community" className="text-xs font-medium text-primary">Open</Link>}
      >
        {moments.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-3xl" />
            ))}
          </div>
        ) : moments.data?.length ? (
          <div className="space-y-3">
            {moments.data.map((m) => <MomentCard key={m.id} moment={m} me={me} />)}
            <Link to="/community" className="block text-center text-sm font-medium text-primary">See more in your community →</Link>
          </div>
        ) : (
          <EmptyState
            emoji="📍"
            title="No Moments yet."
            description="Your Birthday Twins are probably doing something interesting right now. Be the first to share yours."
            action={
              <Link to="/create">
                <Button className="rounded-full">Share a Moment</Button>
              </Link>
            }
          />
        )}
      </Section>

      <Section
        title="People around the world"
        action={<Link to="/explore" className="text-xs font-medium text-primary">Explore</Link>}
      >
        <div className="panel flex flex-wrap gap-2 p-4">
          {(stats.data?.byCountry ?? []).slice(0, 12).map((c) => (
            <span
              key={c.country}
              className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium"
            >
              {flagFor(c.code)} {c.country} · {c.count}
            </span>
          ))}
          {!stats.data?.byCountry.length && (
            <p className="text-sm text-muted-foreground">
              We'll show where your twins live as soon as we find them.
            </p>
          )}
        </div>
      </Section>
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="panel p-4 text-center">
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
