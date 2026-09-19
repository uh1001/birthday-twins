import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { MONTHS, formatCount, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Birthday Twin — Find the people who share your birthday" },
      {
        name: "description",
        content:
          "Birthday Twin helps you discover and connect with people around the world born on the exact same day as you.",
      },
      { property: "og:title", content: "Birthday Twin — Find your Birthday Twins" },
      {
        property: "og:description",
        content: "Discover life through people who share your birthday.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [result, setResult] = useState<{ total: number; countries: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function preview() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("country")
      .eq("birth_month", month)
      .eq("birth_day", day)
      .limit(5000);
    const rows = data ?? [];
    setResult({
      total: rows.length,
      countries: new Set(rows.map((r) => r.country).filter(Boolean)).size,
    });
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/auth">
          <Button variant="ghost" className="rounded-full">
            Sign in
          </Button>
        </Link>
      </header>

      <section className="relative overflow-hidden px-5 pb-16 pt-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] gradient-glow" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            🎂 Same day. Completely different lives.
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] sm:text-6xl">
            Discover life through people who{" "}
            <span className="text-gradient-warm">share your birthday</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            A student in Texas. A designer in Tokyo. A teacher in London. All born on your exact
            day. Birthday Twin is where they meet.
          </p>

          <div className="mx-auto mt-8 max-w-md panel p-4 text-left">
            <p className="text-sm font-medium">When is your birthday?</p>
            <div className="mt-3 flex gap-2">
              <select
                value={month}
                onChange={(e) => {
                  setMonth(Number(e.target.value));
                  setResult(null);
                }}
                className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={day}
                onChange={(e) => {
                  setDay(Number(e.target.value));
                  setResult(null);
                }}
                className="h-11 w-24 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={preview} disabled={loading} className="mt-3 w-full rounded-full">
              {loading ? "Looking…" : "Find my Birthday Twins"}
            </Button>

            {result && (
              <div className="mt-4 animate-rise rounded-2xl bg-surface p-4 text-center">
                <p className="font-display text-lg font-semibold">
                  We found {formatCount(result.total)} people
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  born on {monthDayLabel(month, day)}, living in {result.countries} countries.
                </p>
                <Link to="/auth" className="mt-3 block">
                  <Button className="w-full rounded-full">Meet them</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              emoji: "🌍",
              title: "Birthday Communities",
              body: "Every date has its own space — moments, questions and people from everywhere.",
            },
            {
              emoji: "🗺️",
              title: "Twins around the world",
              body: "See which countries your Birthday Twins live in and explore their lives.",
            },
            {
              emoji: "💬",
              title: "Real conversations",
              body: "One thoughtful question a day, answered by people born on your day.",
            },
          ].map((f) => (
            <div key={f.title} className="panel p-5">
              <p className="text-2xl">{f.emoji}</p>
              <h3 className="mt-3 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Birthday Twin · Discover life through people who share your birthday
      </footer>
    </div>
  );
}
