import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient defaults are tuned for an admin dashboard:
 * - 5min stale window matches Supabase realtime gaps and avoids hammering
 *   server actions on tab focus
 * - retry: 1 — server actions surface real errors; bouncing them is misleading
 * - refetchOnWindowFocus off — explicit invalidation is clearer than implicit refetch
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
