"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { UrlFacetedFilter } from "@/components/ui/url-faceted-filter";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/ticket-badges";
import type { Paginated } from "@/lib/types/pagination";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketWithMeta,
} from "@/lib/types/support";

const STATUS_OPTIONS = Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const PRIORITY_OPTIONS = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function AdminTicketsTable({
  result,
}: {
  result: Paginated<SupportTicketWithMeta>;
}) {
  const { state, setPage, setPageSize, setSearch, setFilter } = useTableUrlState({
    filterKeys: ["status", "priority"],
  });
  const [searchInput, setSearchInput] = React.useState(state.q);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => setSearchInput(state.q), [state.q]);

  const columns = React.useMemo<ColumnDef<SupportTicketWithMeta>[]>(
    () => [
      {
        accessorKey: "subject",
        meta: { label: "Ticket" },
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ticket" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/admin/support/${row.original.id}`}
              className="font-medium leading-tight hover:underline"
            >
              {row.original.subject}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              #{row.original.ticket_no} · {row.original.message_count ?? 0} message
              {(row.original.message_count ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        ),
      },
      {
        id: "broker",
        accessorFn: (row) => row.broker?.name ?? "",
        meta: { label: "Broker" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Broker" />,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.broker?.name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "priority",
        meta: { label: "Priority" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) =>
          row.original.priority === "normal" ? (
            <span className="text-sm text-muted-foreground">Normal</span>
          ) : (
            <TicketPriorityBadge priority={row.original.priority} />
          ),
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
      },
      {
        id: "assigned",
        accessorFn: (row) => row.assigned_admin?.name ?? "",
        meta: { label: "Assigned" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.assigned_admin?.name ?? "Unassigned"}
          </span>
        ),
      },
      {
        accessorKey: "last_message_at",
        meta: { label: "Last activity" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last activity" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.last_message_at), {
              addSuffix: true,
            })}
          </span>
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
        searchColumnId={["subject", "broker"]}
        searchPlaceholder="Search tickets by subject…"
        searchValue={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          startTransition(() => setSearch(v));
        }}
        toolbarRight={
          <div className="flex items-center gap-2">
            <UrlFacetedFilter
              title="Status"
              value={state.filters.status}
              onChange={(v) => startTransition(() => setFilter("status", v))}
              options={STATUS_OPTIONS}
            />
            <UrlFacetedFilter
              title="Priority"
              value={state.filters.priority}
              onChange={(v) => startTransition(() => setFilter("priority", v))}
              options={PRIORITY_OPTIONS}
            />
          </div>
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
