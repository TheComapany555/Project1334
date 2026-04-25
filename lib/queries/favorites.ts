"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFavoriteListingIds,
  toggleFavorite as toggleFavoriteAction,
} from "@/lib/actions/favorites";

const FAV_IDS_KEY = ["favorites", "ids"] as const;

/** Set of favorited listing ids — drives every heart icon in lists. */
export function useFavoriteListingIds() {
  return useQuery({
    queryKey: FAV_IDS_KEY,
    queryFn: getFavoriteListingIds,
    staleTime: 60_000,
  });
}

/**
 * Optimistic favorite toggle. The heart flips immediately on click; if the
 * server rejects it (e.g. logged out mid-session), we roll back.
 */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => toggleFavoriteAction(listingId),
    onMutate: async (listingId) => {
      await qc.cancelQueries({ queryKey: FAV_IDS_KEY });
      const previous = qc.getQueryData<string[]>(FAV_IDS_KEY) ?? [];
      const next = previous.includes(listingId)
        ? previous.filter((id) => id !== listingId)
        : [...previous, listingId];
      qc.setQueryData(FAV_IDS_KEY, next);
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(FAV_IDS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FAV_IDS_KEY });
      // Saved page renders the full favorite list — refresh that too.
      qc.invalidateQueries({ queryKey: ["favorites", "list"] });
    },
  });
}
