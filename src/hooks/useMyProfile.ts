import { useQuery } from "@tanstack/react-query";
import { fetchMyProfile, fetchYearTwinIds } from "@/lib/api";

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });
}

/** IDs of Year Twins (same full birth date) — computed privately on the server. */
export function useYearTwinIds() {
  const { data: me } = useMyProfile();
  const q = useQuery({
    queryKey: ["year-twin-ids", me?.id, me?.birth_year],
    queryFn: fetchYearTwinIds,
    enabled: !!me?.birth_year,
    staleTime: 60_000,
  });
  return new Set(q.data ?? []);
}
