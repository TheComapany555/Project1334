"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Pure-UI state that survives reloads but doesn't belong on the server:
 * - sidebar collapse state
 * - dismissed banners (e.g. "verify your email" prompt)
 * - recent searches (drives the search input's history dropdown)
 *
 * Server data (listings, contacts, etc.) does NOT live here — that's
 * what TanStack Query is for. Putting server data into Zustand creates
 * dual sources of truth.
 */

type UIState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  dismissedBanners: string[];
  dismissBanner: (key: string) => void;
  resetDismissedBanners: () => void;

  recentSearches: string[];
  pushRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
};

const MAX_RECENT_SEARCHES = 8;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      dismissedBanners: [],
      dismissBanner: (key) => {
        const set_ = new Set(get().dismissedBanners);
        set_.add(key);
        set({ dismissedBanners: Array.from(set_) });
      },
      resetDismissedBanners: () => set({ dismissedBanners: [] }),

      recentSearches: [],
      pushRecentSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        const next = [
          trimmed,
          ...get().recentSearches.filter((q) => q !== trimmed),
        ].slice(0, MAX_RECENT_SEARCHES);
        set({ recentSearches: next });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "salebiz-ui",
      storage: createJSONStorage(() => localStorage),
      // Persist only what makes sense across sessions
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        dismissedBanners: s.dismissedBanners,
        recentSearches: s.recentSearches,
      }),
    },
  ),
);
