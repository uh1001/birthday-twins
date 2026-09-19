import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Profile, TwinStats } from "@/lib/api";
import { formatCount, monthDayLabel } from "@/lib/birthday";

export function ShareCard({ profile, stats }: { profile: Profile; stats: TwinStats }) {
  const text = `I found my Birthday Twins 🎂\n${monthDayLabel(profile.birth_month, profile.birth_day)}\n${formatCount(stats.total)} people\n${stats.countries} countries\nBirthday Twin`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Birthday Twin", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Card copied — paste it anywhere");
      }
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 gradient-glow" />
      <div className="relative">
        <p className="text-4xl">🎂</p>
        <p className="mt-3 font-display text-xl font-semibold">
          {monthDayLabel(profile.birth_month, profile.birth_day)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface p-3">
            <p className="font-display text-lg font-semibold">{formatCount(stats.total)}</p>
            <p className="text-xs text-muted-foreground">people</p>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <p className="font-display text-lg font-semibold">{stats.countries}</p>
            <p className="text-xs text-muted-foreground">countries</p>
          </div>
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Birthday Twin
        </p>
        <Button onClick={share} className="mt-5 w-full rounded-full">
          <Share2 className="size-4" /> Share my Birthday Twin card
        </Button>
      </div>
    </div>
  );
}
