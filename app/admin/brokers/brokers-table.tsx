"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { BrokerActions } from "./broker-actions";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { UrlFacetedFilter } from "@/components/ui/url-faceted-filter";
import type { Paginated } from "@/lib/types/pagination";
import type { BrokerForAdmin } from "@/lib/actions/admin-brokers";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

const ROLE_LABEL: Record<string, string> = { owner: "Owner", member: "Member" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BrokersTable({ result }: { result: Paginated<BrokerForAdmin> }) {
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

  const columns = React.useMemo<ColumnDef<BrokerForAdmin>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Broker" },
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Broker" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium leading-tight">
              {row.original.name ?? "Unnamed broker"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: "agency",
        accessorFn: (row) => row.agency_name ?? "",
        meta: { label: "Agency" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Agency" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{row.original.agency_name ?? "—"}</span>
            {row.original.agency_role && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {ROLE_LABEL[row.original.agency_role] ?? row.original.agency_role}
              </Badge>
            )}
          </div>
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
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <BrokerActions brokerId={row.original.id} status={row.original.status} />
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
        searchColumnId={["name", "agency"]}
        searchPlaceholder="Search brokers by name or company…"
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
