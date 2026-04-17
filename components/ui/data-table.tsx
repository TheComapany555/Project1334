"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
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

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column id(s) used for the search input. Search is case-insensitive contains.
   *  Pass a string for single-column search or an array to search across multiple columns. */
  searchColumnId?: string | string[];
  searchPlaceholder?: string;
  facetedFilters?: FacetedFilter[];
  /** Optional toolbar slot rendered to the right of the filters. */
  toolbarRight?: React.ReactNode;
  /** Optional empty state shown when no data exists at all. */
  emptyState?: React.ReactNode;
  /** Default page size. */
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
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumnId,
  searchPlaceholder = "Search…",
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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: defaultPageSize, pageIndex: 0 },
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: getRowId
      ? (row, idx) => getRowId(row, idx)
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
      // Fallback: search across all visible string-y values
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
      <div className="rounded-md border bg-card overflow-hidden">
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
      />
    </div>
  );
}
