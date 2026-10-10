import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bookmark, Compass, Home, MessageCircle, PlusCircle, Shield, Sparkles, User, Users, UserPlus, BookOpen } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/create", label: "Create", icon: PlusCircle },
  { to: "/community", label: "Communities", icon: Users },
  { to: "/me", label: "Profile", icon: User },
] as const;

const linkCls =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground";

function useUnread(profileId?: string) {
  const qc = useQueryClient();
  const notifications = useQuery({
    queryKey: ["unread-notifications", profileId],
    enabled: !!profileId,
    queryFn: async () =>
      (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", profileId!).is("read_at", null)).count ?? 0,
  });
  const messages = useQuery({
    queryKey: ["unread-messages", profileId],
    enabled: !!profileId,
    queryFn: async () =>
      (await supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", profileId!).is("read_at", null)).count ?? 0,
  });
  useEffect(() => {
    if (!profileId) return;
    supabase.rpc("ensure_birthday_notification").then(() => qc.invalidateQueries({ queryKey: ["unread-notifications"] }));
    const ch = supabase
      .channel(`inbox-${profileId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` }, () => {
        qc.invalidateQueries({ queryKey: ["unread-notifications"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${profileId}` }, () => {
        qc.invalidateQueries({ queryKey: ["unread-messages"] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["thread"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [profileId, qc]);
  return { notifications: notifications.data ?? 0, messages: messages.data ?? 0 };
}

function Dot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center text-[10px] font-semibold leading-5 text-primary-foreground">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { data: profile, isLoading } = useMyProfile();
  const navigate = useNavigate();
  const unread = useUnread(profile?.id);

  useEffect(() => {
    if (!isLoading && (profile === null || (profile && !profile.onboarded))) navigate({ to: "/onboarding" });
  }, [isLoading, profile, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
          <div className="my-2 h-px bg-border" />
          <Link to="/messages" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
            <MessageCircle className="size-5" /> Messages <Dot n={unread.messages} />
          </Link>
          <Link to="/notifications" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
            <Bell className="size-5" /> Notifications <Dot n={unread.notifications} />
          </Link>
          <Link to="/twins" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
            <Sparkles className="size-5" /> My Twins
          </Link>
          <Link to="/connections" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
            <UserPlus className="size-5" /> Connections
          </Link>
          <Link to="/saved" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
            <Bookmark className="size-5" /> Saved
          </Link>
          <Link to="/yearbook" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
            <BookOpen className="size-5" /> Yearbook
          </Link>
          {profile?.isModerator && (
            <Link to="/moderation" activeProps={{ className: "bg-accent text-accent-foreground" }} className={linkCls}>
              <Shield className="size-5" /> Moderation
            </Link>
          )}
        </nav>
        {profile && (
          <Link to="/me" className="mt-auto flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-accent/50">
            <img src={profile.avatar_url ?? ""} alt="" className="size-9 rounded-full bg-surface object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.first_name}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.xp} XP</p>
            </div>
          </Link>
        )}
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo compact={false} />
        <div className="flex items-center gap-2">
          <IconLink to="/messages" label="Messages" n={unread.messages}><MessageCircle className="size-4" /></IconLink>
          <IconLink to="/notifications" label="Notifications" n={unread.notifications}><Bell className="size-4" /></IconLink>
        </div>
      </header>

      <main className={cn("mx-auto w-full max-w-2xl px-4 pb-28 pt-5 lg:max-w-3xl", "lg:ml-64 lg:pb-12")}>
        {title && <h1 className="mb-4 font-display text-2xl font-semibold">{title}</h1>}
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-1.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary" }}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground"
            >
              <Icon className={to === "/create" ? "size-6" : "size-5"} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function IconLink({ to, label, n, children }: { to: "/messages" | "/notifications"; label: string; n: number; children: ReactNode }) {
  return (
    <Link to={to} aria-label={label} className="relative grid size-9 place-items-center rounded-full border border-border">
      {children}
      {n > 0 && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
    </Link>
  );
}
