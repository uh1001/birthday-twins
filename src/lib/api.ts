import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Moment = Tables<"moments"> & { profiles?: Profile | null };
export type Message = Tables<"messages">;
export type DailyQuestion = Tables<"daily_questions">;
export type Answer = Tables<"answers"> & { profiles?: Profile | null };
export type Notification = Tables<"notifications">;

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTwins(me: Profile, limit = 60) {
  if (!me.birth_month || !me.birth_day) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("birth_month", me.birth_month)
    .eq("birth_day", me.birth_day)
    .neq("id", me.id)
    .eq("is_private", false)
    .order("xp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type TwinStats = {
  total: number;
  countries: number;
  sameAge: number;
  byCountry: { country: string; code: string; count: number }[];
};

export async function fetchTwinStats(me: Profile): Promise<TwinStats> {
  if (!me.birth_month || !me.birth_day)
    return { total: 0, countries: 0, sameAge: 0, byCountry: [] };

  const { data, error } = await supabase
    .from("profiles")
    .select("country, country_code, birth_year")
    .eq("birth_month", me.birth_month)
    .eq("birth_day", me.birth_day)
    .limit(5000);
  if (error) throw error;

  const rows = data ?? [];
  const map = new Map<string, { country: string; code: string; count: number }>();
  let sameAge = 0;
  for (const r of rows) {
    if (r.country) {
      const entry = map.get(r.country) ?? {
        country: r.country,
        code: r.country_code ?? "",
        count: 0,
      };
      entry.count += 1;
      map.set(r.country, entry);
    }
    if (me.birth_year && r.birth_year === me.birth_year) sameAge += 1;
  }
  return {
    total: rows.length,
    countries: map.size,
    sameAge: Math.max(sameAge - 1, 0),
    byCountry: [...map.values()].sort((a, b) => b.count - a.count),
  };
}

export async function fetchCommunityMoments(me: Profile, limit = 30) {
  if (!me.birth_month || !me.birth_day) return [];
  const { data: twins } = await supabase
    .from("profiles")
    .select("id")
    .eq("birth_month", me.birth_month)
    .eq("birth_day", me.birth_day)
    .limit(400);
  const ids = (twins ?? []).map((t) => t.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("moments")
    .select("*, profiles(*)")
    .in("profile_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Moment[];
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMoments(profileId: string) {
  const { data, error } = await supabase
    .from("moments")
    .select("*, profiles(*)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Moment[];
}

export async function fetchTodaysQuestion() {
  const { data, error } = await supabase
    .from("daily_questions")
    .select("*")
    .order("ask_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAnswers(questionId: string, me?: Profile | null) {
  let ids: string[] | null = null;
  if (me?.birth_month && me.birth_day) {
    const { data: twins } = await supabase
      .from("profiles")
      .select("id")
      .eq("birth_month", me.birth_month)
      .eq("birth_day", me.birth_day)
      .limit(400);
    ids = (twins ?? []).map((t) => t.id);
  }
  let query = supabase
    .from("answers")
    .select("*, profiles(*)")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (ids && ids.length) query = query.in("profile_id", ids);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Answer[];
}

export async function awardXp(profile: Profile, amount: number) {
  await supabase
    .from("profiles")
    .update({ xp: profile.xp + amount })
    .eq("id", profile.id);
}

export async function notifySelf(
  profileId: string,
  kind: string,
  title: string,
  body?: string,
  actorId?: string,
) {
  await supabase.from("notifications").insert({
    profile_id: profileId,
    kind,
    title,
    body: body ?? null,
    actor_id: actorId ?? null,
  });
}

export async function fetchConnections(profileId: string) {
  const { data, error } = await supabase
    .from("connections")
    .select("following_id")
    .eq("follower_id", profileId);
  if (error) throw error;
  return (data ?? []).map((c) => c.following_id);
}

export async function fetchConversations(me: Profile) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;
  const messages = data ?? [];
  const byPartner = new Map<string, { last: Message; unread: number }>();
  for (const m of messages) {
    const partner = m.sender_id === me.id ? m.recipient_id : m.sender_id;
    const entry = byPartner.get(partner) ?? { last: m, unread: 0 };
    if (m.recipient_id === me.id && !m.read_at) entry.unread += 1;
    byPartner.set(partner, entry);
  }
  const ids = [...byPartner.keys()];
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  return (profiles ?? []).map((p) => ({
    profile: p,
    last: byPartner.get(p.id)!.last,
    unread: byPartner.get(p.id)!.unread,
  }));
}

export function xpRank(xp: number) {
  if (xp >= 1200) return { name: "Constellation", next: null, floor: 1200 };
  if (xp >= 700) return { name: "Storyteller", next: 1200, floor: 700 };
  if (xp >= 350) return { name: "Connector", next: 700, floor: 350 };
  if (xp >= 120) return { name: "Explorer", next: 350, floor: 120 };
  return { name: "New arrival", next: 120, floor: 0 };
}
