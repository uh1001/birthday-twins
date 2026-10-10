import { Link } from "@tanstack/react-router";
import type { Profile } from "@/lib/api";
import { ageFrom, flagFor } from "@/lib/birthday";
import { Badge } from "@/components/ui/badge";

export function TwinCard({ profile, me }: { profile: Profile; me?: Profile | null | undefined }) {
  const age = profile.show_age ? ageFrom(profile.birth_year, profile.birth_month, profile.birth_day) : null;
  const yearTwin = !!me?.birth_year && me.birth_year === profile.birth_year;

  return (
    <Link
      to="/u/$username"
      params={{ username: profile.username }}
      className="panel group flex w-full flex-col gap-3 p-4 transition-all hover:shadow-lift"
    >
      <div className="flex items-center gap-3">
        <img
          src={profile.avatar_url ?? ""}
          alt={profile.first_name}
          className="size-14 shrink-0 rounded-2xl object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">{profile.first_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {flagFor(profile.country_code)} {profile.city}
            {age ? ` · ${age}` : ""}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {profile.occupation}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Badge className="rounded-full bg-accent text-accent-foreground hover:bg-accent">
          Birthday Twin
        </Badge>
        {yearTwin && (
          <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">
            Year Twin
          </Badge>
        )}
      </div>
    </Link>
  );
}
