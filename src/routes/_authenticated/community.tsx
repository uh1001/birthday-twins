import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { MomentCard } from "@/components/MomentCard";
import { TwinCard } from "@/components/TwinCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  awardXp,
  fetchAnswers,
  fetchCommunityMoments,
  fetchTodaysQuestion,
  fetchTwinStats,
  fetchTwins,
} from "@/lib/api";
import { ageFrom, flagFor, formatCount, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Birthday Community — Birthday Twin" },
      { name: "description", content: "Moments, members and today's question from your birthday." },
      { property: "og:title", content: "Birthday Community — Birthday Twin" },
      { property: "og:description", content: "Everyone who shares your birthday, in one place." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [answer, setAnswer] = useState("");
  const [country, setCountry] = useState("all");
  const [age, setAge] = useState("all");
  const [interest, setInterest] = useState("");

  const stats = useQuery({ queryKey: ["twin-stats", me?.id], queryFn: () => fetchTwinStats(me!), enabled: !!me });
  const moments = useQuery({ queryKey: ["community-moments", me?.id, "all"], queryFn: () => fetchCommunityMoments(me!, 40), enabled: !!me });
  const members = useQuery({ queryKey: ["twins", me?.id, "all"], queryFn: () => fetchTwins(me!, 200), enabled: !!me });
  const question = useQuery({ queryKey: ["daily-question"], queryFn: fetchTodaysQuestion });
  const answers = useQuery({
    queryKey: ["answers", question.data?.id, me?.id],
    queryFn: () => fetchAnswers(question.data!.id, me),
    enabled: !!question.data && !!me,
  });

  const filtered = useMemo(() => {
    return (members.data ?? []).filter((p) => {
      if (country !== "all" && p.country !== country) return false;
      const a = ageFrom(p.birth_year, p.birth_month, p.birth_day);
      if (age !== "all" && a !== null) {
        const [lo, hi] = age.split("-").map(Number);
        if (a < lo || a > hi) return false;
      }
      if (interest && !p.interests.some((i) => i.toLowerCase().includes(interest.toLowerCase()))) return false;
      return true;
    });
  }, [members.data, country, age, interest]);

  async function post() {
    if (!me) return;
    const text = body.trim();
    if (!text || text.length > 500) return toast.error("Write 1–500 characters");
    const { error } = await supabase.from("moments").insert({
      profile_id: me.id,
      body: text,
      image_url: imageUrl.trim() || null,
      city: me.city,
      country: me.country,
    });
    if (error) return toast.error("Couldn't post your Moment");
    await awardXp(me, 15);
    setBody("");
    setImageUrl("");
    toast.success("Moment shared · +15 XP");
    qc.invalidateQueries();
  }

  async function submitAnswer() {
    if (!me || !question.data) return;
    const text = answer.trim();
    if (!text || text.length > 500) return toast.error("Write 1–500 characters");
    const { error } = await supabase.from("answers").insert({ question_id: question.data.id, profile_id: me.id, body: text });
    if (error) return toast.error(error.message.includes("duplicate") ? "You already answered today" : "Couldn't save answer");
    await awardXp(me, 20);
    setAnswer("");
    toast.success("Answer shared · +20 XP");
    qc.invalidateQueries();
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl gradient-warm p-6 text-primary-foreground shadow-lift">
        <p className="text-xs uppercase tracking-[0.18em] opacity-85">Birthday Community</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">🎂 {me ? monthDayLabel(me.birth_month, me.birth_day) : "…"}</h1>
        <p className="mt-2 text-sm opacity-90">
          🌎 {formatCount(stats.data?.total ?? 0)} members in {stats.data?.countries ?? 0} countries
        </p>
      </div>

      <Tabs defaultValue="moments" className="mt-5">
        <TabsList className="grid w-full grid-cols-3 rounded-full">
          <TabsTrigger value="moments" className="rounded-full">Moments</TabsTrigger>
          <TabsTrigger value="question" className="rounded-full">Question</TabsTrigger>
          <TabsTrigger value="members" className="rounded-full">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="moments" className="mt-4 space-y-3">
          <div className="panel space-y-3 p-4">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What are you doing today?" maxLength={500} className="min-h-20 rounded-xl" />
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Photo or video link (optional)" className="rounded-xl" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">📍 {me?.city || "City hidden"}</span>
              <Button onClick={post} className="rounded-full">Share Moment</Button>
            </div>
          </div>
          {moments.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          {moments.data?.map((m) => <MomentCard key={m.id} moment={m} me={me} />)}
          {moments.data?.length === 0 && (
            <EmptyState emoji="📍" title="No Moments yet." description="Your Birthday Twins are probably doing something interesting right now. Be the first to share yours." />
          )}
        </TabsContent>

        <TabsContent value="question" className="mt-4 space-y-3">
          <div className="panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today's question</p>
            <p className="mt-2 font-display text-lg font-semibold">{question.data?.question}</p>
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer…" maxLength={500} className="mt-4 min-h-20 rounded-xl" />
            <Button onClick={submitAnswer} className="mt-3 w-full rounded-full">Answer</Button>
          </div>
          {answers.data?.map((a) => (
            <div key={a.id} className="panel p-4">
              <div className="flex items-center gap-2">
                <img src={a.profiles?.avatar_url ?? ""} alt="" className="size-8 rounded-full object-cover" />
                <p className="text-sm font-semibold">{a.profiles?.first_name}</p>
                <span className="text-xs text-muted-foreground">{flagFor(a.profiles?.country_code)} {a.profiles?.city}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{a.body}</p>
            </div>
          ))}
          {answers.data?.length === 0 && (
            <EmptyState emoji="💬" title="No answers yet" description="Be the first of your Birthday Twins to answer today's question." />
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="panel grid gap-2 p-3 sm:grid-cols-3">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="all">All countries</option>
              {stats.data?.byCountry.map((c) => <option key={c.country} value={c.country}>{flagFor(c.code)} {c.country}</option>)}
            </select>
            <select value={age} onChange={(e) => setAge(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="all">Any age</option>
              <option value="13-24">18–24</option>
              <option value="25-34">25–34</option>
              <option value="35-44">35–44</option>
              <option value="45-120">45+</option>
            </select>
            <Input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Interest" className="h-10 rounded-xl" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {filtered.map((p) => <TwinCard key={p.id} profile={p} me={me} />)}
          </div>
          {members.data && filtered.length === 0 && (
            <div className="mt-3"><EmptyState emoji="🔎" title="No one matches those filters" description="Try a different country, age range or interest." /></div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
