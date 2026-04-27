"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils";

type Code = {
  code: string;
  percentOff: number;
  redemptions: number;
  maxUses: number | null;
};

export function DiscountCodesRedemptionsTable({ data }: { data: Code[] }) {
  const columns = useMemo<ColumnDef<Code>[]>(
    () => [
      {
        accessorKey: "code",
        meta: { label: "Code" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-sm">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "percentOff",
        meta: { label: "Discount" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Discount" />
        ),
        cell: ({ row }) => (
          <span className="text-emerald-700 dark:text-emerald-400 font-medium tabular-nums text-xs">
            {row.original.percentOff}% off
          </span>
        ),
        sortingFn: (a, b) => a.original.percentOff - b.original.percentOff,
      },
      {
        accessorKey: "redemptions",
        meta: { label: "Redemptions" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Redemptions" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {row.original.redemptions}
          </span>
        ),
        sortingFn: (a, b) => a.original.redemptions - b.original.redemptions,
      },
      {
        id: "limit",
        meta: { label: "Limit" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Limit" />
        ),
        accessorFn: (row) => row.maxUses ?? Number.MAX_SAFE_INTEGER,
        cell: ({ row }) =>
          row.original.maxUses != null ? (
            <span className="text-sm tabular-nums text-muted-foreground">
              {row.original.redemptions}/{row.original.maxUses}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Unlimited</span>
          ),
      },
      {
        id: "progress",
        header: () => (
          <span className="text-xs text-muted-foreground font-medium">
            Usage
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const pct =
            r.maxUses != null
              ? Math.min(100, (r.redemptions / r.maxUses) * 100)
              : Math.min(100, r.redemptions * 5);
          return (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden max-w-[120px]">
              <div
                className={cn(
                  "h-full rounded-full",
                  pct >= 100
                    ? "bg-muted-foreground/40"
                    : pct >= 80
                      ? "bg-amber-500"
                      : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumnId="code"
      searchPlaceholder="Search code..."
      defaultPageSize={10}
      initialSorting={[{ id: "redemptions", desc: true }]}
    />
  );
}
