export type XpEvent = { action: string; points: number; created_at: string };

export const XP_RULES = [
  { action: "profile_complete", label: "Complete your profile", points: 50, limit: "once" },
  { action: "share", label: "Share a post, Moment or Journey entry", points: 15, limit: "up to 5 per day" },
  { action: "answer", label: "Answer the Daily Birthday Question", points: 20, limit: "once per question" },
  { action: "challenge", label: "Join a community challenge", points: 25, limit: "once per challenge" },
  { action: "comment", label: "Comment on someone else's post", points: 3, limit: "up to 10 per day" },
  { action: "connect", label: "Make a connection", points: 10, limit: "up to 10 per day" },
  { action: "event", label: "Host a community event", points: 15, limit: "up to 2 per day" },
] as const;

export function xpRank(xp: number) {
  if (xp >= 1200) return { name: "Constellation", next: null, floor: 1200 };
  if (xp >= 700) return { name: "Storyteller", next: 1200, floor: 700 };
  if (xp >= 350) return { name: "Connector", next: 700, floor: 350 };
  if (xp >= 120) return { name: "Explorer", next: 350, floor: 120 };
  return { name: "New arrival", next: 120, floor: 0 };
}

export type Badge = { id: string; emoji: string; name: string; description: string };

const BADGES: (Badge & { test: (c: Record<string, number>) => boolean })[] = [
  { id: "hello", emoji: "👋", name: "Hello, twins", description: "Completed your profile", test: (c) => (c.profile_complete ?? 0) >= 1 },
  { id: "storyteller", emoji: "📸", name: "Storyteller", description: "Shared 5 posts or Moments", test: (c) => (c.share ?? 0) >= 5 },
  { id: "curious", emoji: "💬", name: "Curious mind", description: "Answered 3 daily questions", test: (c) => (c.answer ?? 0) >= 3 },
  { id: "challenger", emoji: "🏅", name: "Challenger", description: "Joined a community challenge", test: (c) => (c.challenge ?? 0) >= 1 },
  { id: "connector", emoji: "🤝", name: "Connector", description: "Made 3 connections", test: (c) => (c.connect ?? 0) >= 3 },
  { id: "host", emoji: "🎈", name: "Host", description: "Hosted a community event", test: (c) => (c.event ?? 0) >= 1 },
  { id: "supporter", emoji: "🧡", name: "Supporter", description: "Left 10 comments for others", test: (c) => (c.comment ?? 0) >= 10 },
];

export function countByAction(events: Pick<XpEvent, "action">[]) {
  const c: Record<string, number> = {};
  for (const e of events) c[e.action] = (c[e.action] ?? 0) + 1;
  return c;
}

export function earnedBadges(events: Pick<XpEvent, "action">[]): Badge[] {
  const c = countByAction(events);
  return BADGES.filter((b) => b.test(c)).map(({ test: _t, ...b }) => b);
}

export const ALL_BADGES: Badge[] = BADGES.map(({ test: _t, ...b }) => b);
