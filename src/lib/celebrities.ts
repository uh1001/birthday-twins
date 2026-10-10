export type Celebrity = { name: string; known_for: string; year?: number; url?: string; image?: string; source: "wikipedia" };

/**
 * Public figures born on a given month/day, from Wikipedia's "On this day" feed
 * (Wikimedia REST API — free, no key). Kept behind this function so the source can be swapped.
 */
export async function fetchCelebrities(month: number, day: number, limit = 12): Promise<Celebrity[]> {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const res = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/births/${mm}/${dd}`);
  if (!res.ok) throw new Error("Celebrity data unavailable");
  const json = (await res.json()) as {
    births?: { text: string; year?: number; pages?: { titles?: { normalized?: string }; description?: string; thumbnail?: { source: string }; content_urls?: { desktop?: { page?: string } } }[] }[];
  };
  return (json.births ?? [])
    .filter((b) => b.pages?.[0]?.thumbnail && (b.year ?? 0) >= 1850)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, limit)
    .map((b) => {
      const page = b.pages![0];
      return {
        name: page.titles?.normalized ?? b.text.split(",")[0],
        known_for: page.description ?? b.text,
        year: b.year,
        url: page.content_urls?.desktop?.page,
        image: page.thumbnail?.source,
        source: "wikipedia" as const,
      };
    });
}
