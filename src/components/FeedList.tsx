import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { MomentCard } from "@/components/MomentCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedItem, Profile } from "@/lib/api";

export function FeedList({
  items,
  isLoading,
  isError,
  me,
  empty,
}: {
  items?: FeedItem[] | undefined;
  isLoading?: boolean | undefined;
  isError?: boolean | undefined;
  me?: Profile | null | undefined;
  empty: { emoji?: string | undefined; title: string; description: string; action?: ReactNode | undefined };
}) {
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>;
  if (isError) return <EmptyState emoji="⚠️" title="Couldn't load posts" description="Check your connection and try again." />;
  if (!items?.length) return <EmptyState {...empty} />;
  return <div className="space-y-3">{items.map((m) => <MomentCard key={m.id} moment={m} me={me} />)}</div>;
}
