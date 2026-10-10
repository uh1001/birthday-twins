import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { FeedList } from "@/components/FeedList";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchSaved } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved — Birthday Twin" },
      { name: "description", content: "Posts you saved from your Birthday Twins." },
      { property: "og:title", content: "Saved — Birthday Twin" },
      { property: "og:description", content: "Your saved Birthday Twin stories." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { data: me } = useMyProfile();
  const saved = useQuery({ queryKey: ["saved", me?.id], queryFn: () => fetchSaved(me!.id), enabled: !!me });
  return (
    <AppShell title="Saved">
      <FeedList
        items={saved.data}
        isLoading={saved.isLoading}
        isError={saved.isError}
        me={me}
        empty={{ emoji: "🔖", title: "Nothing saved yet", description: "Tap the bookmark on any post to keep it here." }}
      />
    </AppShell>
  );
}
