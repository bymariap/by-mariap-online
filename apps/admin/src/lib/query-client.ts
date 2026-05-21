import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403 || err.status === 404)
        )
          return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
