import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export { xpRank } from "@/lib/xp";

export type Profile = Tables<"profiles">;
export type MyProfile = Profile & { isModerator: boolean };
export type Moment = Tables<"moments"> & { profiles?: Profile | null };
export type FeedItem = Moment & { likeCount: number; commentCount: number; liked: boolean; saved: boolean };
export type Message = Tables<"messages">;
export type DailyQuestion = Tables<"daily_questions">;
export type Answer = Tables<"answers"> & { profiles?: Profile | null };
export type Notification = Tables<"notifications">;
export type Comment = Tables<"comments"> & { profiles?: Profile | null };

/** Own profile with private values (birth year, location) merged in for the owner only. */
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [{ data: priv }, { data: roles }] = await Promise.all([
    supabase.from("profile_private").select("*").eq("profile_id", data.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
  ]);
  return {
    ...data,
    birth_year: priv?.birth_year ?? data.birth_year,
    city: priv?.city ?? data.city,
    country: priv?.country ?? data.country,
    country_code: priv?.country_code ?? data.country_code,
    isModerator: (roles ?? []).some((r) => r.role === "moderator" || r.role === "admin"),
  };
}

export async function fetchTwins(me: Pick<Profile, "id" | "birth_month" | "birth_day">, limit = 60) {
  if (!me.birth_month || !me.birth_day) return [];
  return fetchCommunityMembers(me.birth_month, me.birth_day, limit, me.id);
}

export async function fetchCommunityMembers(month: number, day: number, limit = 200, excludeId?: string) {
  let q = supabase
    .from("profiles")
    .select("*")
    .eq("birth_month", month)
    .eq("birth_day", day)
    .eq("onboarded", true)
    .order("xp", { ascending: false })
    .limit(limit);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchYearTwinIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc("year_twin_ids");
  if (error) throw error;
  return (data ?? []) as string[];
}

export type TwinStats = {
  total: number;
  countries: number;
  sameAge: number;
  byCountry: { country: string; code: string; count: number }[];
};

export async function fetchCommunityStats(month: number, day: number) {
  const { data, error } = await supabase
    .from("profiles")
    .select("country, country_code")
    .eq("birth_month", month)
    .eq("birth_day", day)
    .limit(5000);
  if (error) throw error;
  const rows = data ?? [];
  const map = new Map<string, { country: string; code: string; count: number }>();
  for (const r of rows) {
    if (!r.country) continue;
    const e = map.get(r.country) ?? { country: r.country, code: r.country_code ?? "", count: 0 };
    e.count += 1;
    map.set(r.country, e);
  }
  return { total: rows.length, countries: map.size, byCountry: [...map.values()].sort((a, b) => b.count - a.count) };
}

export async function fetchTwinStats(me: Profile): Promise<TwinStats> {
  if (!me.birth_month || !me.birth_day) return { total: 0, countries: 0, sameAge: 0, byCountry: [] };
  const [base, yearIds] = await Promise.all([fetchCommunityStats(me.birth_month, me.birth_day), fetchYearTwinIds()]);
  return { ...base, total: Math.max(base.total - 1, 0), sameAge: yearIds.length };
}

const FEED_SELECT = "*, profiles(*), likes(count), comments(count)";

/** Profile IDs in a birthday community (fast two-step filter instead of a joined filter). */
export async function communityIds(month: number, day: number, extra?: { yearbook?: boolean }) {
  let q = supabase.from("profiles").select("id").eq("birth_month", month).eq("birth_day", day).limit(2000);
  if (extra?.yearbook) q = q.eq("show_in_yearbook", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

type RawFeed = Tables<"moments"> & {
  profiles: Profile;
  likes: { count: number }[];
  comments: { count: number }[];
};

async function enrich(rows: RawFeed[], meId?: string): Promise<FeedItem[]> {
  const ids = rows.map((r) => r.id);
  let liked = new Set<string>();
  let saved = new Set<string>();
  if (meId && ids.length) {
    const [l, s] = await Promise.all([
      supabase.from("likes").select("moment_id").eq("profile_id", meId).in("moment_id", ids),
      supabase.from("saves").select("moment_id").eq("profile_id", meId).in("moment_id", ids),
    ]);
    liked = new Set((l.data ?? []).map((x) => x.moment_id));
    saved = new Set((s.data ?? []).map((x) => x.moment_id));
  }
  return rows.map(({ likes, comments, ...m }) => ({
    ...m,
    likeCount: likes?.[0]?.count ?? 0,
    commentCount: comments?.[0]?.count ?? 0,
    liked: liked.has(m.id),
    saved: saved.has(m.id),
  }));
}

export type FeedFilter = {
  month?: number | null | undefined;
  day?: number | null | undefined;
  profileId?: string | undefined;
  kind?: "moment" | "post" | "journey" | "notJourney" | undefined;
  media?: "image" | "video" | "any" | undefined;
  search?: string | undefined;
  limit?: number | undefined;
};

export async function fetchFeed(f: FeedFilter, meId?: string): Promise<FeedItem[]> {
  let q = supabase.from("moments").select(FEED_SELECT).order("created_at", { ascending: false }).limit(f.limit ?? 30);
  if (f.month && f.day) {
    const ids = await communityIds(f.month, f.day);
    if (!ids.length) return [];
    q = q.in("profile_id", ids);
  }
  if (f.profileId) q = q.eq("profile_id", f.profileId);
  if (f.kind === "notJourney") q = q.neq("kind", "journey");
  else if (f.kind) q = q.eq("kind", f.kind);
  if (f.media === "any") q = q.not("media_type", "is", null);
  else if (f.media) q = q.eq("media_type", f.media);
  if (f.search) q = q.ilike("body", `%${f.search.replace(/[%,()]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw error;
  return enrich((data ?? []) as unknown as RawFeed[], meId);
}

export async function fetchMoment(id: string, meId?: string) {
  const { data, error } = await supabase.from("moments").select(FEED_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await enrich([data as unknown as RawFeed], meId))[0];
}

export async function fetchSaved(meId: string) {
  const { data: s } = await supabase.from("saves").select("moment_id").eq("profile_id", meId).order("created_at", { ascending: false }).limit(50);
  const ids = (s ?? []).map((x) => x.moment_id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("moments").select(FEED_SELECT).in("id", ids);
  if (error) throw error;
  return enrich((data ?? []) as unknown as RawFeed[], meId);
}

/** Journey entries for one person's most recent day, oldest first. */
export async function fetchJourney(profileId: string) {
  const { data, error } = await supabase
    .from("moments")
    .select("*, profiles(*)")
    .eq("profile_id", profileId)
    .eq("kind", "journey")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = (data ?? []) as Moment[];
  if (!rows.length) return { day: null as string | null, entries: [] as Moment[] };
  const day = new Date(rows[0]!.created_at).toDateString();
  return { day, entries: rows.filter((r) => new Date(r.created_at).toDateString() === day).reverse() };
}

/** Birthday-community members who posted Journey entries most recently. */
export async function fetchCommunityJourneys(month: number, day: number, limit = 6) {
  const { data, error } = await supabase
    .from("moments")
    .select("profile_id, created_at, body, profiles(*)")
    .eq("kind", "journey")
    .in("profile_id", await communityIds(month, day))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const seen = new Map<string, { profile: Profile; count: number; latest: string; preview: string }>();
  for (const r of (data ?? []) as unknown as { profile_id: string; created_at: string; body: string; profiles: Profile }[]) {
    const e = seen.get(r.profile_id);
    if (e) e.count += 1;
    else seen.set(r.profile_id, { profile: r.profiles, count: 1, latest: r.created_at, preview: r.body });
  }
  return [...seen.values()].slice(0, limit);
}

export async function fetchComments(momentId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(*)")
    .eq("moment_id", momentId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Comment[];
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (error) throw error;
  return data;
}

/** @deprecated use fetchFeed */
export async function fetchMoments(profileId: string) {
  return fetchFeed({ profileId, limit: 100 });
}

export async function fetchTodaysQuestion() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_questions")
    .select("*")
    .lte("ask_date", today)
    .order("ask_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: any } = await supabase.from("daily_questions").select("*").order("ask_date").limit(1).maybeSingle();
  return any;
}

export async function fetchAnswers(questionId: string, month?: number | null, day?: number | null) {
  let q = supabase
    .from("answers")
    .select("*, profiles(*)")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (month && day) q = q.in("profile_id", await communityIds(month, day));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Answer[];
}

export async function notifySelf(profileId: string, kind: string, title: string, body?: string, link?: string) {
  await supabase.from("notifications").insert({ profile_id: profileId, kind, title, body: body ?? null, link: link ?? null, category: "community" });
}

// ---------- Connections ----------
export type ConnectionState = { state: "none" | "outgoing" | "incoming" | "connected"; id?: string };

export async function fetchConnectionState(meId: string, otherId: string): Promise<ConnectionState> {
  const { data } = await supabase
    .from("connections")
    .select("*")
    .or(`and(follower_id.eq.${meId},following_id.eq.${otherId}),and(follower_id.eq.${otherId},following_id.eq.${meId})`);
  const row = data?.[0];
  if (!row) return { state: "none" };
  if (row.status === "accepted") return { state: "connected", id: row.id };
  return { state: row.follower_id === meId ? "outgoing" : "incoming", id: row.id };
}

export async function fetchConnectionsOf(profileId: string) {
  const { data, error } = await supabase
    .from("connections")
    .select("id, follower_id, following_id, status, created_at")
    .eq("status", "accepted")
    .or(`follower_id.eq.${profileId},following_id.eq.${profileId}`);
  if (error) throw error;
  const ids = (data ?? []).map((c) => (c.follower_id === profileId ? c.following_id : c.follower_id));
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  return (profiles ?? []).map((p) => ({ profile: p, connectionId: data!.find((c) => c.follower_id === p.id || c.following_id === p.id)!.id }));
}

export async function fetchRequests(meId: string) {
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("status", "pending")
    .or(`follower_id.eq.${meId},following_id.eq.${meId}`);
  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((r) => (r.follower_id === meId ? r.following_id : r.follower_id));
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows
    .map((r) => ({
      id: r.id,
      incoming: r.following_id === meId,
      profile: byId.get(r.follower_id === meId ? r.following_id : r.follower_id),
    }))
    .filter((r): r is { id: string; incoming: boolean; profile: Profile } => !!r.profile);
}

export async function fetchConversations(me: Profile) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;
  const byPartner = new Map<string, { last: Message; unread: number }>();
  for (const m of data ?? []) {
    const partner = m.sender_id === me.id ? m.recipient_id : m.sender_id;
    const entry = byPartner.get(partner) ?? { last: m, unread: 0 };
    if (m.recipient_id === me.id && !m.read_at) entry.unread += 1;
    byPartner.set(partner, entry);
  }
  const ids = [...byPartner.keys()];
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  return (profiles ?? [])
    .map((p) => ({ profile: p, last: byPartner.get(p.id)!.last, unread: byPartner.get(p.id)!.unread }))
    .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
}

export async function fetchXpEvents(profileId: string) {
  const { data, error } = await supabase
    .from("xp_events")
    .select("action, points, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function reportContent(input: { reporterId: string; reportedId: string; reason: string; momentId?: string; commentId?: string }) {
  return supabase.from("reports").insert({
    reporter_id: input.reporterId,
    reported_id: input.reportedId,
    reason: input.reason.slice(0, 500),
    moment_id: input.momentId ?? null,
    comment_id: input.commentId ?? null,
  });
}
