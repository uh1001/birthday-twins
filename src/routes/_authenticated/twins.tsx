import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ShareCard } from "@/components/ShareCard";
import { TwinCard } from "@/components/TwinCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchTwinStats, fetchTwins } from "@/lib/api";
import { formatCount, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/twins")({
  head: () => ({
    meta: [
      { title: "Your Birthday Twins — Birthday Twin" },
      { name: "description", content: "The people born on your exact day, around the world." },
      { property: "og:title", content: "Your Birthday Twins" },
      { property: "og:description", content: "The people born on your exact day, around the world." },
    ],
  }),
  component: TwinsPage,
});

function TwinsPage() {
  const { data: me } = useMyProfile();

  const twins = useQuery({
    queryKey: ["twins", me?.id],
    queryFn: () => fetchTwins(me!),
    enabled: !!me,
  });
  const stats = useQuery({
    queryKey: ["twin-stats", me?.id],
    queryFn: () => fetchTwinStats(me!),
    enabled: !!me,
  });

  return (
    <AppShell>
      <div className="animate-rise text-center">
        <p className="text-4xl">🎂</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">We found your Birthday Twins</h1>
        {me && (
          <p className="mt-2 text-sm text-muted-foreground">
            Everyone here was born on {monthDayLabel(me.birth_month, me.birth_day)}.
          </p>
        )}
      </div>

      {stats.data && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { value: formatCount(stats.data.total), label: "people" },
            { value: stats.data.countries, label: "countries" },
            { value: stats.data.sameAge, label: "your age" },
          ].map((s) => (
            <div key={s.label} className="panel p-4 text-center">
              <p className="font-display text-xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {twins.isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        {twins.data?.map((t) => <TwinCard key={t.id} profile={t} me={me} />)}
      </div>

      {twins.data && twins.data.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="You're first on this date"
            description="No one else has joined your birthday yet. Share your card — your twins are out there."
            action={
              <Link to="/explore">
                <Button className="rounded-full">Explore other days</Button>
              </Link>
            }
          />
        </div>
      )}

      {me && stats.data && (
        <div className="mt-6">
          <ShareCard profile={me} stats={stats.data} />
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Link to="/home">
          <Button variant="outline" className="rounded-full">
            Go to my feed
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}
