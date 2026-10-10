import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/Composer";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: z.object({ kind: z.enum(["post", "moment", "journey"]).optional() }),
  head: () => ({
    meta: [
      { title: "Create — Birthday Twin" },
      { name: "description", content: "Share a post, a quick Moment or an entry in Today's Journey." },
      { property: "og:title", content: "Create — Birthday Twin" },
      { property: "og:description", content: "Share your day with people born on the same day as you." },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { data: me } = useMyProfile();
  const { kind } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <AppShell title="Create">
      <p className="mb-4 text-sm text-muted-foreground">
        Your Birthday Twins are curious how you live. Share a story, a quick Moment, or document your day in Today's Journey.
      </p>
      {me ? (
        <Composer
          me={me}
          defaultKind={kind ?? "post"}
          onDone={() => navigate({ to: "/u/$username", params: { username: me.username } })}
        />
      ) : (
        <Skeleton className="h-64 rounded-3xl" />
      )}
    </AppShell>
  );
}
