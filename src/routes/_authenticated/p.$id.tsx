import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { MomentCard } from "@/components/MomentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { fetchMoment } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/p/$id")({
  head: () => ({
    meta: [
      { title: "Post — Birthday Twin" },
      { name: "description", content: "A post from someone who shares a birthday." },
      { property: "og:title", content: "Post — Birthday Twin" },
      { property: "og:description", content: "A story from a Birthday Twin." },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const { data: me } = useMyProfile();
  const post = useQuery({ queryKey: ["post", id, me?.id], queryFn: () => fetchMoment(id, me?.id), enabled: !!me });
  return (
    <AppShell>
      <Link to="/home" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      {post.isLoading && <Skeleton className="h-64 rounded-3xl" />}
      {post.isError && <EmptyState emoji="⚠️" title="Couldn't load this post" description="Try again in a moment." />}
      {post.data === null && <EmptyState emoji="🔒" title="Post unavailable" description="It may have been deleted, or it belongs to a private profile." />}
      {post.data && <MomentCard moment={post.data} me={me} defaultOpenComments />}
    </AppShell>
  );
}
