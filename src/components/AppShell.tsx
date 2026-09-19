import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Compass, Home, MessageCircle, Sparkles, User, Users } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/me", label: "Profile", icon: User },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { data: profile, isLoading } = useMyProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarded) {
      navigate({ to: "/onboarding" });
    }
    if (!isLoading && profile === null) {
      navigate({ to: "/onboarding" });
    }
  }, [isLoading, profile, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
          <Link
            to="/twins"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
          >
            <Sparkles className="size-5" />
            My Twins
          </Link>
          <Link
            to="/notifications"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
          >
            <Bell className="size-5" />
            Notifications
          </Link>
        </nav>
        {profile && (
          <Link
            to="/me"
            className="mt-auto flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-accent/50"
          >
            <img
              src={profile.avatar_url ?? ""}
              alt=""
              className="size-9 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.first_name}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.xp} XP</p>
            </div>
          </Link>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo compact={false} />
        <Link
          to="/notifications"
          className="grid size-9 place-items-center rounded-full border border-border"
        >
          <Bell className="size-4" />
        </Link>
      </header>

      <main className={cn("mx-auto w-full max-w-2xl px-4 pb-28 pt-5 lg:max-w-3xl lg:pl-4", "lg:ml-64 lg:pb-12")}>
        {title && <h1 className="mb-4 font-display text-2xl font-semibold">{title}</h1>}
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-1.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary" }}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
