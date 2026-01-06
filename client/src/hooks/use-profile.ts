import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";

export function useProfile(userId?: string) {
  return useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });
}
