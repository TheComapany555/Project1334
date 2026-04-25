"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DataTableFacetedFilter,
  type FacetedFilterOption,
} from "@/components/ui/data-table-faceted-filter";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { cn } from "@/lib/utils";

export type FacetedFilter = {
  columnId: string;
  title: string;
  options: FacetedFilterOption[];
};

/**
 * Server-side pagination control. When provided, the table switches to
 * "manual" mode: TanStack Table no longer slices/filters/sorts client-side
 * for pagination; the parent owns page state and refetches data per page.
 *
 * Search and faceted filters still work locally on the page-of-data the
 * parent passes in. For full server-driven search/filter, hoist `searchValue`
 * and `facetedFilters` state into the parent and pass them as initialState
 * (or use a controlled handler — see `onSearchChange`).
 */
export type ServerPaginationProps = {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPaginationChange: (next: { pageIndex: number; pageSize: number }) => void;
  /** Whether a refetch is in-flight. Renders a subtle overlay. */
  isFetching?: boolean;
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column id(s) used for the search input. Search is case-insensitive contains.
   *  Pass a string for single-column search or an array to search across multiple columns. */
  searchColumnId?: string | string[];
  searchPlaceholder?: string;
  /** Controlled search value — needed when search should drive a server refetch. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  facetedFilters?: FacetedFilter[];
  /** Optional toolbar slot rendered to the right of the filters. */
  toolbarRight?: React.ReactNode;
  /** Optional empty state shown when no data exists at all. */
  emptyState?: React.ReactNode;
  /** Default page size (client mode only — ignored in serverPagination mode). */
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  /** Initial sort state. */
  initialSorting?: SortingState;
  /** Initial column visibility. */
  initialColumnVisibility?: VisibilityState;
  enableRowSelection?: boolean;
  showSelectedCount?: boolean;
  /** Stable id for the row, defaults to row index. */
  getRowId?: (row: TData, index: number) => string;
  className?: string;
  /** Opt-in to server-driven pagination. When set, page nav fires onPaginationChange. */
  serverPagination?: ServerPaginationProps;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumnId,
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange,
  facetedFilters = [],
  toolbarRight,
  emptyState,
  defaultPageSize = 10,
  pageSizeOptions,
  initialSorting = [],
  initialColumnVisibility = {},
  enableRowSelection = false,
  showSelectedCount = false,
  getRowId,
  className,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const isServerMode = !!serverPagination;
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("");
  const globalFilter = searchValue !== undefined ? searchValue : internalGlobalFilter;
  const setGlobalFilter = React.useCallback(
    (value: string) => {
      if (onSearchChange) onSearchChange(value);
      else setInternalGlobalFilter(value);
    },
    [onSearchChange],
  );

  // In server mode, the parent owns pagination — translate to TanStack state.
  const paginationState: PaginationState | undefined = React.useMemo(
    () =>
      isServerMode
        ? {
            pageIndex: serverPagination!.pageIndex,
            pageSize: serverPagination!.pageSize,
          }
        : undefined,
    [isServerMode, serverPagination],
  );

  const handlePaginationChange = React.useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      if (!isServerMode || !paginationState) return;
      const current = paginationState;
      const next = typeof updater === "function" ? updater(current) : updater;
      if (
        next.pageIndex !== current.pageIndex ||
        next.pageSize !== current.pageSize
      ) {
        serverPagination!.onPaginationChange(next);
      }
    },
    [isServerMode, paginationState, serverPagination],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(paginationState ? { pagination: paginationState } : {}),
    },
    initialState: isServerMode
      ? undefined
      : { pagination: { pageSize: defaultPageSize, pageIndex: 0 } },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    ...(isServerMode
      ? {
          manualPagination: true,
          pageCount:
            serverPagination!.total === 0
              ? 0
              : Math.ceil(serverPagination!.total / serverPagination!.pageSize),
          onPaginationChange: handlePaginationChange,
        }
      : {}),
    getRowId: getRowId ? (row, idx) => getRowId(row, idx) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Skip client-side pagination row model entirely in server mode
    ...(isServerMode ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, _columnId, value) => {
      if (!value) return true;
      const search = String(value).toLowerCase();
      if (searchColumnId) {
        const ids = Array.isArray(searchColumnId)
          ? searchColumnId
          : [searchColumnId];
        return ids.some((id) => {
          const cell = row.getValue(id);
          return cell != null && String(cell).toLowerCase().includes(search);
        });
      }
      return row.getAllCells().some((cell) => {
        const v = cell.getValue();
        return v != null && String(v).toLowerCase().includes(search);
      });
    },
  });

  const isFiltered =
    table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  const hasToolbar =
    Boolean(searchColumnId) ||
    facetedFilters.length > 0 ||
    Boolean(toolbarRight);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {hasToolbar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {searchColumnId && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            )}
            {facetedFilters.map((f) => {
              const column = table.getColumn(f.columnId);
              if (!column) return null;
              return (
                <DataTableFacetedFilter
                  key={f.columnId}
                  column={column}
                  title={f.title}
                  options={f.options}
                />
              );
            })}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  table.resetColumnFilters();
                  setGlobalFilter("");
                }}
                className="h-9 px-2 lg:px-3"
              >
                Reset
                <X className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DataTableViewOptions table={table} />
            {toolbarRight}
          </div>
        </div>
      )}
      <div className="rounded-md border bg-card overflow-hidden relative">
        {isServerMode && serverPagination?.isFetching && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-4 bg-background/40 backdrop-blur-[1px]">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    {data.length === 0 && emptyState
                      ? emptyState
                      : "No results match your filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
        showSelectedCount={enableRowSelection && showSelectedCount}
        serverTotal={serverPagination?.total}
      />
    </div>
  );
}
