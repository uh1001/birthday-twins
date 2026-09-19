import type { Profile } from "@/lib/api";
import { daysUntilBirthday, monthDayLabel } from "@/lib/birthday";

export function BirthdayCard({
  profile,
  variant = "self",
}: {
  profile: Profile;
  variant?: "self" | "twin";
}) {
  const days = daysUntilBirthday(profile.birth_month, profile.birth_day);

  return (
    <div className="relative overflow-hidden rounded-3xl gradient-warm p-5 text-primary-foreground shadow-lift">
      <div className="absolute -right-8 -top-10 size-36 rounded-full bg-primary-foreground/15" />
      <div className="absolute -bottom-12 -left-6 size-28 rounded-full bg-primary-foreground/10" />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-85">
          {variant === "self" ? "Your birthday" : "Birthday Twin"}
        </p>
        <p className="mt-2 font-display text-3xl font-semibold">
          🎂 {monthDayLabel(profile.birth_month, profile.birth_day)}
        </p>
        {days !== null && (
          <p className="mt-2 text-sm opacity-90">
            {days === 0 ? "Today is the day 🎉" : `${days} days to go`}
          </p>
        )}
      </div>
    </div>
  );
}
