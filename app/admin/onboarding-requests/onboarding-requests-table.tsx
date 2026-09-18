"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { UrlFacetedFilter } from "@/components/ui/url-faceted-filter";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Paginated } from "@/lib/types/pagination";
import {
  LISTING_COUNT_LABELS,
  ONBOARDING_STATUS_LABELS,
  type OnboardingRequest,
  type OnboardingRequestStatus,
} from "@/lib/types/onboarding";
import { setOnboardingRequestStatus } from "@/lib/actions/broker-onboarding";

const STATUS_OPTIONS = Object.entries(ONBOARDING_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const STATUS_VARIANT: Record<
  OnboardingRequestStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  new: "default",
  contacted: "warning",
  in_progress: "secondary",
  completed: "success",
  declined: "outline",
};

export function OnboardingRequestsTable({
  result,
}: {
  result: Paginated<OnboardingRequest>;
}) {
  const router = useRouter();
  const { state, setPage, setPageSize, setSearch, setFilter } =
    useTableUrlState({ filterKeys: ["status"] });
  const [searchInput, setSearchInput] = React.useState(state.q);
  const [isPending, startTransition] = React.useTransition();
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => setSearchInput(state.q), [state.q]);

  async function changeStatus(id: string, status: OnboardingRequestStatus) {
    setSavingId(id);
    const res = await setOnboardingRequestStatus(id, status);
    setSavingId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Couldn't update the status.");
      return;
    }
    toast.success(`Marked as ${ONBOARDING_STATUS_LABELS[status].toLowerCase()}.`);
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<OnboardingRequest>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Requester" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Requester" />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="leading-tight font-medium">{row.original.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              #{row.original.request_no}
              {row.original.agency_name ? ` · ${row.original.agency_name}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "email",
        meta: { label: "Contact" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contact" />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 text-sm">
            <a
              href={`mailto:${row.original.email}`}
              className="hover:underline"
            >
              {row.original.email}
            </a>
            {row.original.phone && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                <a href={`tel:${row.original.phone}`} className="hover:underline">
                  {row.original.phone}
                </a>
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "listing_count",
        meta: { label: "Listings" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listings" />
        ),
        cell: ({ row }) =>
          row.original.listing_count ? (
            <span className="text-sm">
              {LISTING_COUNT_LABELS[row.original.listing_count] ??
                row.original.listing_count}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        accessorKey: "message",
        meta: { label: "Message" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Message" />
        ),
        cell: ({ row }) =>
          row.original.message ? (
            <p
              className="text-muted-foreground max-w-[28ch] truncate text-sm"
              title={row.original.message}
            >
              {row.original.message}
            </p>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        accessorKey: "created_at",
        meta: { label: "Received" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Received" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {formatDistanceToNow(new Date(row.original.created_at), {
              addSuffix: true,
            })}
          </span>
        ),
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge
              variant={STATUS_VARIANT[row.original.status]}
              className="border-0"
            >
              {ONBOARDING_STATUS_LABELS[row.original.status]}
            </Badge>
            <Select
              value={row.original.status}
              disabled={savingId === row.original.id}
              onValueChange={(v) =>
                void changeStatus(row.original.id, v as OnboardingRequestStatus)
              }
            >
              <SelectTrigger
                className="h-8 w-[9.5rem]"
                aria-label={`Change status for request #${row.original.request_no}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      },
    ],
    // `changeStatus` is stable enough for this table; savingId drives the
    // disabled state and must be in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savingId],
  );

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={result.rows}
        searchColumnId={["name", "email"]}
        searchPlaceholder="Search by name, email, or agency…"
        searchValue={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          startTransition(() => setSearch(v));
        }}
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
