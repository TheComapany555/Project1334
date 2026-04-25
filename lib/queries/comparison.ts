"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addToComparison as addAction,
  removeFromComparison as removeAction,
  getComparisonListingIds,
} from "@/lib/actions/comparison";

const COMPARISON_IDS_KEY = ["comparison", "ids"] as const;

export function useComparisonIds() {
  return useQuery({
    queryKey: COMPARISON_IDS_KEY,
    queryFn: getComparisonListingIds,
    staleTime: 60_000,
  });
}

/** Optimistic add — rolls back if the server says we're already at 6 max. */
export function useAddToComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => addAction(listingId),
    onMutate: async (listingId) => {
      await qc.cancelQueries({ queryKey: COMPARISON_IDS_KEY });
      const previous = qc.getQueryData<string[]>(COMPARISON_IDS_KEY) ?? [];
      if (!previous.includes(listingId)) {
        qc.setQueryData(COMPARISON_IDS_KEY, [...previous, listingId]);
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(COMPARISON_IDS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: COMPARISON_IDS_KEY });
      qc.invalidateQueries({ queryKey: ["comparison", "list"] });
    },
  });
}

export function useRemoveFromComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => removeAction(listingId),
    onMutate: async (listingId) => {
      await qc.cancelQueries({ queryKey: COMPARISON_IDS_KEY });
      const previous = qc.getQueryData<string[]>(COMPARISON_IDS_KEY) ?? [];
      qc.setQueryData(
        COMPARISON_IDS_KEY,
        previous.filter((id) => id !== listingId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(COMPARISON_IDS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: COMPARISON_IDS_KEY });
      qc.invalidateQueries({ queryKey: ["comparison", "list"] });
    },
  });
}
