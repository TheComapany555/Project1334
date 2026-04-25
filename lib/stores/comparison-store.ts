"use client";

import { create } from "zustand";

/**
 * Local optimistic mirror of the server-side comparison cart.
 *
 * Most consumers should use `useComparisonIds()` from
 * `lib/queries/comparison.ts` — TanStack Query already does optimistic
 * updates and is the source of truth for current values.
 *
 * This store exists for cross-component UI bits that don't want to
 * subscribe to a query: e.g. the "compare drawer" open/close state,
 * the "just added X" toast queue, and an in-memory hint of count
 * for components rendered above the QueryClientProvider boundary.
 */

type ComparisonState = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;

  // Cached count — updated by hooks alongside the query mutation.
  // Don't read this for source-of-truth; it's UI-only.
  cachedCount: number;
  setCachedCount: (count: number) => void;
};

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  toggleDrawer: () => set({ drawerOpen: !get().drawerOpen }),

  cachedCount: 0,
  setCachedCount: (count) => set({ cachedCount: Math.max(0, count) }),
}));
