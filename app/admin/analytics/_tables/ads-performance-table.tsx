"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatCompactNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Row = {
  placement: "homepage" | "search" | "listing";
  activeAds: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

const PLACEMENT_LABELS: Record<Row["placement"], string> = {
  homepage: "Homepage",
  search: "Search results",
  listing: "Listing pages",
};

const PLACEMENT_OPTIONS = [
  { value: "homepage", label: "Homepage" },
  { value: "search", label: "Search results" },
  { value: "listing", label: "Listing pages" },
];

export function AdsPerformanceTable({ data }: { data: Row[] }) {
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "placement",
        meta: { label: "Placement" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Placement" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-medium">
            {PLACEMENT_LABELS[row.original.placement]}
          </span>
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        accessorKey: "activeAds",
        meta: { label: "Active ads" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Active ads" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.activeAds}</span>
        ),
        sortingFn: (a, b) => a.original.activeAds - b.original.activeAds,
      },
      {
        accessorKey: "impressions",
        meta: { label: "Impressions" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Impressions" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCompactNumber(row.original.impressions)}
          </span>
        ),
        sortingFn: (a, b) => a.original.impressions - b.original.impressions,
      },
      {
        accessorKey: "clicks",
        meta: { label: "Clicks" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Clicks" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCompactNumber(row.original.clicks)}
          </span>
        ),
        sortingFn: (a, b) => a.original.clicks - b.original.clicks,
      },
      {
        accessorKey: "ctr",
        meta: { label: "CTR" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="CTR" />
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "font-semibold tabular-nums",
              row.original.ctr >= 0.02 &&
                "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatPercent(row.original.ctr * 100, 2)}
          </span>
        ),
        sortingFn: (a, b) => a.original.ctr - b.original.ctr,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      facetedFilters={[
        {
          columnId: "placement",
          title: "Placement",
          options: PLACEMENT_OPTIONS,
        },
      ]}
      defaultPageSize={10}
      initialSorting={[{ id: "ctr", desc: true }]}
    />
  );
}
