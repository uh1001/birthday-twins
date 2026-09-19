export type Celebrity = { name: string; known_for: string; month: number; day: number };

// Static starter set. Designed so a live celebrity API can replace this module
// later without touching the UI: keep the same shape and export.
export const CELEBRITIES: Celebrity[] = [
  { name: "Serena Williams", known_for: "Tennis champion", month: 9, day: 26 },
  { name: "Lionel Messi", known_for: "Footballer", month: 6, day: 24 },
  { name: "Frida Kahlo", known_for: "Painter", month: 7, day: 6 },
  { name: "Hayao Miyazaki", known_for: "Filmmaker", month: 1, day: 5 },
  { name: "Ada Lovelace", known_for: "Mathematician", month: 12, day: 10 },
  { name: "Rihanna", known_for: "Musician & founder", month: 2, day: 20 },
  { name: "Keanu Reeves", known_for: "Actor", month: 9, day: 2 },
  { name: "Malala Yousafzai", known_for: "Activist", month: 7, day: 12 },
  { name: "Adam Sandler", known_for: "Actor", month: 9, day: 9 },
  { name: "Jimmy Fallon", known_for: "Television host", month: 9, day: 19 },
  { name: "Beyoncé", known_for: "Musician", month: 9, day: 4 },
  { name: "Freddie Mercury", known_for: "Musician", month: 9, day: 5 },
  { name: "Zendaya", known_for: "Actor", month: 9, day: 1 },
  { name: "Marie Curie", known_for: "Scientist", month: 11, day: 7 },
  { name: "Leonardo DiCaprio", known_for: "Actor", month: 11, day: 11 },
  { name: "Stephen Curry", known_for: "Basketball player", month: 3, day: 14 },
  { name: "Albert Einstein", known_for: "Physicist", month: 3, day: 14 },
  { name: "Lady Gaga", known_for: "Musician", month: 3, day: 28 },
  { name: "Emma Watson", known_for: "Actor", month: 4, day: 15 },
  { name: "David Beckham", known_for: "Footballer", month: 5, day: 2 },
  { name: "Audrey Hepburn", known_for: "Actor", month: 5, day: 4 },
  { name: "Kanye West", known_for: "Musician", month: 6, day: 8 },
  { name: "Tom Hanks", known_for: "Actor", month: 7, day: 9 },
  { name: "Barack Obama", known_for: "Former US president", month: 8, day: 4 },
  { name: "Usain Bolt", known_for: "Sprinter", month: 8, day: 21 },
  { name: "Bruce Lee", known_for: "Martial artist", month: 11, day: 27 },
  { name: "Taylor Swift", known_for: "Musician", month: 12, day: 13 },
  { name: "Denzel Washington", known_for: "Actor", month: 12, day: 28 },
  { name: "Elvis Presley", known_for: "Musician", month: 1, day: 8 },
  { name: "Oprah Winfrey", known_for: "Media leader", month: 1, day: 29 },
  { name: "Shakira", known_for: "Musician", month: 2, day: 2 },
  { name: "Cristiano Ronaldo", known_for: "Footballer", month: 2, day: 5 },
  { name: "Rosa Parks", known_for: "Civil rights leader", month: 2, day: 4 },
  { name: "Yayoi Kusama", known_for: "Artist", month: 3, day: 22 },
  { name: "Maya Angelou", known_for: "Poet", month: 4, day: 4 },
  { name: "Lin-Manuel Miranda", known_for: "Composer", month: 1, day: 16 },
];

export function celebritiesFor(month?: number | null, day?: number | null) {
  if (!month || !day) return [];
  return CELEBRITIES.filter((c) => c.month === month && c.day === day);
}
