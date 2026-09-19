import { useQuery } from "@tanstack/react-query";
import { fetchMyProfile } from "@/lib/api";

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });
}
