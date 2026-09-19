export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthDayLabel(month?: number | null, day?: number | null) {
  if (!month || !day) return "Birthday not set";
  return `${MONTHS[month - 1]} ${day}`;
}

export function shortLabel(month?: number | null, day?: number | null) {
  if (!month || !day) return "—";
  return `${MONTHS[month - 1]?.slice(0, 3)} ${day}`;
}

export function daysUntilBirthday(month?: number | null, day?: number | null) {
  if (!month || !day) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function ageFrom(year?: number | null, month?: number | null, day?: number | null) {
  if (!year || !month || !day) return null;
  const now = new Date();
  let age = now.getFullYear() - year;
  const had = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!had) age -= 1;
  return age;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function flagFor(code?: string | null) {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatCount(n: number) {
  return n.toLocaleString();
}
