import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { MONTHS } from "@/lib/birthday";
import { notifySelf } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — Birthday Twin" },
      { name: "description", content: "Tell your Birthday Twins who you are." },
      { property: "og:title", content: "Set up your profile — Birthday Twin" },
      { property: "og:description", content: "Tell your Birthday Twins who you are." },
    ],
  }),
  component: Onboarding,
});

const INTERESTS = [
  "Travel",
  "Photography",
  "Cooking",
  "Football",
  "Music",
  "Books",
  "Films",
  "Running",
  "Design",
  "Gaming",
  "Coffee",
  "Hiking",
  "Art",
  "Science",
  "Fashion",
  "Volunteering",
];

const AVATARS = [12, 25, 33, 47, 56, 61, 5, 18].map((i) => `https://i.pravatar.cc/300?img=${i}`);

const schema = z.object({
  first_name: z.string().trim().min(1, "Add your first name").max(40),
  username: z
    .string()
    .trim()
    .min(3, "Username needs 3+ characters")
    .max(24)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores"),
  city: z.string().trim().max(60).optional(),
  country: z.string().trim().max(60).optional(),
  occupation: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).optional(),
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useMyProfile();
  const today = new Date();

  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [year, setYear] = useState<string>("");
  const [showAge, setShowAge] = useState(true);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.onboarded) navigate({ to: "/home" });
  }, [profile, navigate]);

  function toggleInterest(i: string) {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      first_name: firstName,
      username: username.toLowerCase(),
      city,
      country,
      occupation,
      bio,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again");

      const payload = {
        user_id: auth.user.id,
        first_name: parsed.data.first_name,
        username: parsed.data.username,
        birth_month: month,
        birth_day: day,
        birth_year: year ? Number(year) : null,
        show_age: showAge,
        avatar_url: avatar ?? null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        occupation: parsed.data.occupation || null,
        bio: parsed.data.bio || null,
        interests,
        onboarded: true,
        xp: 60,
      };

      const { data: saved, error } = profile
        ? await supabase.from("profiles").update(payload).eq("id", profile.id).select().single()
        : await supabase.from("profiles").insert(payload).select().single();

      if (error) {
        throw new Error(
          error.message.includes("duplicate") ? "That username is taken" : error.message,
        );
      }

      await notifySelf(
        saved.id,
        "twins",
        "We found your Birthday Twins 🎂",
        `People born on ${MONTHS[month - 1]} ${day} are waiting for you.`,
      );
      await qc.invalidateQueries();
      navigate({ to: "/twins" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your profile");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="relative min-h-screen bg-background px-5 py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 gradient-glow" />
      <div className="relative mx-auto max-w-lg">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold">Tell us who you are</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your birthday is all we need to find your twins. Everything else helps them get to know
          you.
        </p>

        <form onSubmit={save} className="mt-6 flex flex-col gap-5">
          <div className="panel space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first">First name</Label>
                <Input
                  id="first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 rounded-xl"
                  maxLength={40}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="maya_k"
                  className="h-11 rounded-xl"
                  maxLength={24}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Birthday</Label>
              <div className="flex gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
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
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="h-11 w-24 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year">Birth year (optional, private by default)</Label>
              <Input
                id="year"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1996"
                className="h-11 rounded-xl"
              />
              <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                <span className="text-sm">Show my age on my profile</span>
                <Switch checked={showAge} onCheckedChange={setShowAge} />
              </div>
            </div>
          </div>

          <div className="panel space-y-4 p-5">
            <div className="space-y-2">
              <Label>Profile photo</Label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={cn(
                      "size-14 overflow-hidden rounded-2xl border-2 transition-all",
                      avatar === a ? "border-primary" : "border-transparent opacity-70",
                    )}
                  >
                    <img src={a} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
              <Input
                value={avatar ?? ""}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="…or paste an image link"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 rounded-xl"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 rounded-xl"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="occupation">Occupation or studies</Label>
              <Input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Student, nurse, designer…"
                className="h-11 rounded-xl"
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label>Interests</Label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      interests.includes(i)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What does a normal day look like for you?"
                className="min-h-24 rounded-xl"
                maxLength={280}
              />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="h-12 rounded-full text-base">
            {busy ? "Finding your twins…" : "Find my Birthday Twins 🎂"}
          </Button>
        </form>
      </div>
    </div>
  );
}
