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

export function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Max day for a month, allowing Feb 29 (birthdays can be leap days). */
export function daysInMonthForBirthday(month: number) {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
}

export function monthDayLabel(month?: number | null, day?: number | null) {
  if (!month || !day) return "Birthday not set";
  return `${MONTHS[month - 1]} ${day}`;
}

export function shortLabel(month?: number | null, day?: number | null) {
  if (!month || !day) return "—";
  return `${MONTHS[month - 1]?.slice(0, 3)} ${day}`;
}

/** The date a birthday is celebrated in a given year. Feb 29 → Feb 28 in non-leap years. */
export function celebrationDate(year: number, month: number, day: number) {
  if (month === 2 && day === 29 && !isLeapYear(year)) return new Date(year, 1, 28);
  return new Date(year, month - 1, day);
}

/** Calendar-day based (local date of the viewer), so no timezone drift. */
export function daysUntilBirthday(month?: number | null, day?: number | null, now = new Date()) {
  if (!month || !day) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = celebrationDate(now.getFullYear(), month, day);
  if (next < today) next = celebrationDate(now.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/** Birthday Twins share month+day regardless of year. */
export function isBirthdayTwin(
  a: { birth_month: number | null; birth_day: number | null },
  b: { birth_month: number | null; birth_day: number | null },
) {
  return !!a.birth_month && !!a.birth_day && a.birth_month === b.birth_month && a.birth_day === b.birth_day;
}

/** Year Twins share the complete date of birth. */
export function isYearTwin(
  a: { birth_month: number | null; birth_day: number | null; birth_year: number | null },
  b: { birth_month: number | null; birth_day: number | null; birth_year: number | null },
) {
  return isBirthdayTwin(a, b) && !!a.birth_year && a.birth_year === b.birth_year;
}

export function ageFrom(year?: number | null, month?: number | null, day?: number | null, now = new Date()) {
  if (!year || !month || !day) return null;
  let age = now.getFullYear() - year;
  const c = celebrationDate(now.getFullYear(), month, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today < c) age -= 1;
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

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatCount(n: number) {
  return n.toLocaleString();
}
