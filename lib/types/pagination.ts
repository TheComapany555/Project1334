/**
 * Shared shapes used by every paginated server action and table.
 * Keeping the contract uniform lets us reuse the same hooks, URL helpers
 * and DataTable wiring across admin and broker surfaces.
 */

export type SortDirection = "asc" | "desc";

export type SortState = {
  id: string;
  desc: boolean;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: string;
  sortDir?: SortDirection;
};

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Clamp page/pageSize input from the URL or external callers into safe bounds. */
export function normalizePagination(params: {
  page?: number | string | null;
  pageSize?: number | string | null;
}): { page: number; pageSize: number; offset: number } {
  const rawPage = Number(params.page);
  const rawSize = Number(params.pageSize);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(MAX_PAGE_SIZE, Math.floor(rawSize))
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Build the response envelope from a Supabase `.range()` result. */
export function buildPaginated<T>(
  rows: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
