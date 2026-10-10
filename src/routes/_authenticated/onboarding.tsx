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
import { daysInMonthForBirthday, MONTHS } from "@/lib/birthday";
import { COUNTRIES } from "@/lib/countries";
import { uploadMedia } from "@/lib/media";
import { notifySelf } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: z.object({ edit: z.boolean().optional() }),
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
  const { edit } = Route.useSearch();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useMyProfile();
  const today = new Date();

  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [year, setYear] = useState<string>("");
  const [showAge, setShowAge] = useState(false);
  const [showYear, setShowYear] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.onboarded && !edit) navigate({ to: "/home" });
    if (profile) {
      setFirstName(profile.first_name);
      setUsername(profile.username);
      if (profile.birth_month) setMonth(profile.birth_month);
      if (profile.birth_day) setDay(profile.birth_day);
      setYear(profile.birth_year ? String(profile.birth_year) : "");
      setShowAge(profile.show_age);
      setShowYear(profile.show_birth_year);
      setShowLocation(profile.show_location);
      if (profile.avatar_url) setAvatar(profile.avatar_url);
      setCity(profile.city ?? "");
      setCountry(profile.country ?? "");
      setOccupation(profile.occupation ?? "");
      setBio(profile.bio ?? "");
      setInterests(profile.interests);
    }
  }, [profile, navigate, edit]);

  async function onPhoto(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Choose an image file");
    setUploading(true);
    try {
      const up = await uploadMedia(f);
      setAvatar(up.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
    const y = year ? Number(year) : null;
    if (y !== null && (y < 1900 || y > new Date().getFullYear())) {
      toast.error("Enter a valid birth year");
      return;
    }
    if (day > daysInMonthForBirthday(month)) {
      toast.error("That date doesn't exist");
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
        birth_year: y,
        show_age: showAge,
        show_birth_year: showYear,
        show_location: showLocation,
        avatar_url: avatar ?? null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        country_code: COUNTRIES.find((c) => c.name === parsed.data.country)?.code ?? null,
        occupation: parsed.data.occupation || null,
        bio: parsed.data.bio || null,
        interests,
        onboarded: true,
      };

      const { data: saved, error } = profile
        ? await supabase.from("profiles").update(payload).eq("id", profile.id).select().single()
        : await supabase.from("profiles").insert(payload).select().single();

      if (error) {
        throw new Error(
          error.message.includes("duplicate") ? "That username is taken" : error.message,
        );
      }

      // Private values are stored separately; this also lets people clear them.
      await supabase.from("profile_private").upsert({
        profile_id: saved.id,
        birth_year: y,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        country_code: COUNTRIES.find((c) => c.name === parsed.data.country)?.code ?? null,
      });
      if (!profile?.onboarded) {
        await notifySelf(saved.id, "twins", "We found your Birthday Twins 🎂", `People born on ${MONTHS[month - 1]} ${day} are waiting for you.`, "/twins");
      }
      await qc.invalidateQueries();
      if (profile?.onboarded) {
        toast.success("Profile updated");
        navigate({ to: "/me" });
      } else navigate({ to: "/twins" });
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
        <h1 className="mt-6 font-display text-2xl font-semibold">{profile?.onboarded ? "Edit your profile" : "Tell us who you are"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your birthday is all we need to find your twins. Everything else helps them get to know
          you.
        </p>
        <div className="panel mt-4 space-y-2 p-4 text-sm">
          <p className="font-semibold">How birthday matching works</p>
          <p className="text-muted-foreground"><span className="font-medium text-foreground">🎂 Birthday Twins</span> share your birth month and day, whatever year they were born.</p>
          <p className="text-muted-foreground"><span className="font-medium text-foreground">✨ Year Twins</span> share your complete date of birth. We match years privately — your year is never shown unless you choose.</p>
          <p className="text-muted-foreground">Born on February 29? You match other leap-day twins, and we celebrate on Feb 28 in non-leap years.</p>
        </div>

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
                  {Array.from({ length: daysInMonthForBirthday(month) }, (_, i) => i + 1).map((d) => (
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
              <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                <span className="text-sm">Show my birth year</span>
                <Switch checked={showYear} onCheckedChange={setShowYear} />
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
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm">
                {avatar && <img src={avatar} alt="" className="size-10 rounded-xl object-cover" />}
                <span>{uploading ? "Uploading…" : "Upload your own photo (JPG, PNG, WebP, up to 8 MB)"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
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
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Prefer not to say</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
              <span className="text-sm">Show my city and country (optional)</span>
              <Switch checked={showLocation} onCheckedChange={setShowLocation} />
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
            {busy ? "Saving…" : profile?.onboarded ? "Save changes" : "Find my Birthday Twins 🎂"}
          </Button>
        </form>
      </div>
    </div>
  );
}
