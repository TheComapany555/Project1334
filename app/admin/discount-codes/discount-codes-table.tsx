"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import type { DiscountCode } from "@/lib/types/discount-codes";
import {
  toggleDiscountCodeActive,
  deleteDiscountCode,
} from "@/lib/actions/discount-codes";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

type ExpiryState = "expired" | "active" | "none";

function getExpiryState(code: DiscountCode): ExpiryState {
  if (!code.valid_until) return "none";
  return new Date(code.valid_until) < new Date() ? "expired" : "active";
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        active
          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active
            ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]"
            : "bg-muted-foreground/40"
        )}
      />
      {active ? "Active" : "Inactive"}
    </div>
  );
}

function PercentPill({ value }: { value: number }) {
  const isFull = value === 100;
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        isFull
          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
          : "bg-primary/10 text-primary"
      )}
    >
      {value}% off
    </div>
  );
}

function UsageCell({ used, max }: { used: number; max: number | null }) {
  if (max == null) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium tabular-nums">{used}</span>
        <span className="text-[11px] text-muted-foreground">unlimited</span>
      </div>
    );
  }
  const pct = Math.min(100, (used / max) * 100);
  return (
    <div className="space-y-1.5 max-w-[140px]">
      <div className="flex items-center justify-between text-sm tabular-nums">
        <span className="font-medium">{used}</span>
        <span className="text-muted-foreground text-xs">{max}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100
              ? "bg-muted-foreground/40"
              : pct >= 80
                ? "bg-amber-500"
                : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DiscountCodesTable({ codes }: { codes: DiscountCode[] }) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<DiscountCode | null>(null);

  const handleToggle = useCallback(
    async (id: string) => {
      const res = await toggleDiscountCodeActive(id);
      if (res.ok) {
        toast.success("Status updated");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update");
      }
    },
    [router]
  );

  const handleCopy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const res = await deleteDiscountCode(pendingDelete.id);
    if (res.ok) {
      toast.success("Code deleted");
      setPendingDelete(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to delete");
    }
  }, [pendingDelete, router]);

  const columns = useMemo<ColumnDef<DiscountCode>[]>(
    () => [
      {
        accessorKey: "code",
        meta: { label: "Code" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-[13px] leading-tight">
                {row.original.code}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleCopy(row.original.code)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Copy code"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy code</TooltipContent>
              </Tooltip>
            </div>
            {row.original.description && (
              <p className="text-xs text-muted-foreground max-w-[280px] truncate">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "percent_off",
        meta: { label: "Discount" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Discount" />
        ),
        cell: ({ row }) => <PercentPill value={row.original.percent_off} />,
        sortingFn: (a, b) => a.original.percent_off - b.original.percent_off,
      },
      {
        id: "usage",
        accessorFn: (row) => row.used_count,
        meta: { label: "Usage" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Usage" />
        ),
        cell: ({ row }) => (
          <UsageCell
            used={row.original.used_count}
            max={row.original.max_uses}
          />
        ),
      },
      {
        id: "expiry",
        accessorFn: (row) => row.valid_until ?? "",
        meta: { label: "Expires" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Expires" />
        ),
        cell: ({ row }) => {
          const state = getExpiryState(row.original);
          if (state === "none") {
            return (
              <span className="text-sm text-muted-foreground">No expiry</span>
            );
          }
          if (state === "expired") {
            return (
              <span className="text-sm font-medium text-destructive">
                Expired
              </span>
            );
          }
          return (
            <span className="text-sm tabular-nums">
              {formatDate(row.original.valid_until!)}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => (row.active ? "active" : "inactive"),
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <StatusPill active={row.original.active} />,
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        accessorKey: "created_at",
        meta: { label: "Created" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const code = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    aria-label="Open menu"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    {code.code}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/admin/discount-codes/${code.id}/edit`}
                      className="cursor-pointer"
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopy(code.code)}
                    className="cursor-pointer"
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy code
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggle(code.id)}
                    className="cursor-pointer"
                  >
                    {code.active ? (
                      <>
                        <PowerOff className="mr-2 h-3.5 w-3.5" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-3.5 w-3.5" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setPendingDelete(code)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleToggle, handleCopy]
  );

  return (
    <>
      <div className="px-4 pb-4 pt-2">
        <DataTable
          columns={columns}
          data={codes}
          searchColumnId="code"
          searchPlaceholder="Search by code..."
          facetedFilters={[
            { columnId: "status", title: "Status", options: STATUS_OPTIONS },
          ]}
          defaultPageSize={10}
          initialSorting={[{ id: "created_at", desc: true }]}
        />
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this discount code?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-semibold text-foreground">
                {pendingDelete?.code}
              </span>{" "}
              will be removed and cannot be redeemed at checkout. Past payments that used this code stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
