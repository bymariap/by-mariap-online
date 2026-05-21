import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

export interface Me {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: { id: string; name: string };
}

export function useMe() {
  return useQuery<Me, ApiError>({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/me"),
  });
}
