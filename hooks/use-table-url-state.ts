"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Centralized URL-state for paginated tables.
 *
 * Why URL-driven? Page/search/filter live in `?page=&q=...` so:
 * - Browser back/forward works
 * - Links can be shared (admin can DM a filtered listing view)
 * - The server component on `page.tsx` can read the same params and
 *   pre-fetch the right data (no client-only loading flash)
 *
 * Returns helpers that update the URL via `router.replace` (to avoid
 * polluting history when paginating). Filter changes reset to page 1.
 */
export type TableUrlState = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: string | null;
  sortDir: "asc" | "desc" | null;
  filters: Record<string, string | null>;
};

export type UseTableUrlStateOptions = {
  /** Default page size when `?pageSize=` is absent. Default 20. */
  defaultPageSize?: number;
  /** Faceted filter keys to track (e.g. ["status", "visibility"]). */
  filterKeys?: string[];
  /** Debounce in ms for the search input. Default 300. */
  searchDebounceMs?: number;
};

export function useTableUrlState(options: UseTableUrlStateOptions = {}) {
  const {
    defaultPageSize = 20,
    filterKeys = [],
    searchDebounceMs = 300,
  } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = React.useMemo<TableUrlState>(() => {
    const filters: Record<string, string | null> = {};
    for (const key of filterKeys) filters[key] = searchParams.get(key);
    const sortDir = searchParams.get("sortDir");
    return {
      page: Math.max(1, Number(searchParams.get("page")) || 1),
      pageSize: Math.max(1, Number(searchParams.get("pageSize")) || defaultPageSize),
      q: searchParams.get("q") ?? "",
      sortBy: searchParams.get("sortBy"),
      sortDir: sortDir === "asc" || sortDir === "desc" ? sortDir : null,
      filters,
    };
  }, [searchParams, filterKeys, defaultPageSize]);

  const updateParams = React.useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setPage = React.useCallback(
    (page: number) => updateParams({ page: page > 1 ? page : null }),
    [updateParams],
  );

  const setPageSize = React.useCallback(
    (pageSize: number) =>
      updateParams({
        pageSize: pageSize === defaultPageSize ? null : pageSize,
        page: null,
      }),
    [updateParams, defaultPageSize],
  );

  // Debounced search — keeps URL clean while typing.
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSearch = React.useCallback(
    (q: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        updateParams({ q: q || null, page: null });
      }, searchDebounceMs);
    },
    [updateParams, searchDebounceMs],
  );

  const setFilter = React.useCallback(
    (key: string, value: string | null) =>
      updateParams({ [key]: value || null, page: null }),
    [updateParams],
  );

  const setSort = React.useCallback(
    (sortBy: string | null, sortDir: "asc" | "desc" | null) =>
      updateParams({ sortBy: sortBy ?? null, sortDir: sortDir ?? null, page: null }),
    [updateParams],
  );

  const reset = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return {
    state,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    setSort,
    reset,
  };
}
