"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AgencyActions } from "./agency-actions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { UrlFacetedFilter } from "@/components/ui/url-faceted-filter";
import type { Paginated } from "@/lib/types/pagination";
import type { AgencyForAdmin } from "@/lib/actions/admin-brokers";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AgenciesTable({ result }: { result: Paginated<AgencyForAdmin> }) {
  const { state, setPage, setPageSize, setSearch, setFilter } = useTableUrlState({
    filterKeys: ["status"],
  });
  const [searchInput, setSearchInput] = React.useState(state.q);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => setSearchInput(state.q), [state.q]);

  const onSearchChange = (value: string) => {
    setSearchInput(value);
    startTransition(() => setSearch(value));
  };

  const columns = React.useMemo<ColumnDef<AgencyForAdmin>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Agency" },
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Agency" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium leading-tight">{row.original.name}</p>
            {row.original.email && (
              <p className="text-xs text-muted-foreground mt-0.5">{row.original.email}</p>
            )}
          </div>
        ),
      },
      {
        id: "owner",
        accessorFn: (row) => row.owner_name ?? row.owner_email,
        meta: { label: "Owner" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm leading-tight">{row.original.owner_name ?? "Not specified"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.owner_email}</p>
          </div>
        ),
      },
      {
        accessorKey: "broker_count",
        meta: { label: "Brokers" },
        header: ({ column }) => (
          <div className="text-center">
            <DataTableColumnHeader column={column} title="Brokers" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center text-sm tabular-nums">{row.original.broker_count}</div>
        ),
      },
      {
        accessorKey: "listing_count",
        meta: { label: "Listings" },
        header: ({ column }) => (
          <div className="text-center">
            <DataTableColumnHeader column={column} title="Listings" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center text-sm tabular-nums">{row.original.listing_count}</div>
        ),
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} className="border-0" />,
      },
      {
        accessorKey: "created_at",
        meta: { label: "Created" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <AgencyActions agencyId={row.original.id} status={row.original.status} />
        ),
      },
    ],
    [],
  );

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={result.rows}
        searchColumnId={["name", "owner"]}
        searchPlaceholder="Search agencies, owners or emails…"
        searchValue={searchInput}
        onSearchChange={onSearchChange}
        toolbarRight={
          <UrlFacetedFilter
            title="Status"
            value={state.filters.status}
            onChange={(v) => startTransition(() => setFilter("status", v))}
            options={STATUS_OPTIONS}
          />
        }
        serverPagination={{
          pageIndex: result.page - 1,
          pageSize: result.pageSize,
          total: result.total,
          isFetching: isPending,
          onPaginationChange: ({ pageIndex, pageSize }) => {
            startTransition(() => {
              if (pageSize !== result.pageSize) setPageSize(pageSize);
              else setPage(pageIndex + 1);
            });
          },
        }}
      />
    </div>
  );
}
