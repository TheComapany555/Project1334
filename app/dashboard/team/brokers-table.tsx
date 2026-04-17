"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Pencil } from "lucide-react";
import { RemoveBrokerButton } from "./invitation-actions";

type Broker = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  agency_role: "owner" | "member";
  created_at: string;
};

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BrokersTable({ brokers }: { brokers: Broker[] }) {
  const columns = useMemo<ColumnDef<Broker>[]>(
    () => [
      {
        id: "broker",
        accessorFn: (row) => row.name ?? row.email,
        meta: { label: "Broker" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Broker" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              name={row.original.name}
              email={row.original.email}
              photoUrl={row.original.photo_url}
            />
            <span className="font-medium truncate">
              {row.original.name ?? "Not set"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        meta: { label: "Email" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "phone",
        meta: { label: "Phone" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.phone ?? "Not set"}
          </span>
        ),
      },
      {
        accessorKey: "agency_role",
        meta: { label: "Role" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.agency_role === "owner" ? "default" : "secondary"
            }
          >
            {row.original.agency_role === "owner" ? "Owner" : "Member"}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        accessorKey: "created_at",
        meta: { label: "Joined" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Joined" />
        ),
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
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1" asChild>
              <Link href={`/dashboard/team/${row.original.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            {row.original.agency_role !== "owner" && (
              <RemoveBrokerButton
                brokerId={row.original.id}
                brokerName={row.original.name}
              />
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={brokers}
        searchColumnId={["broker", "email", "phone"]}
        searchPlaceholder="Search by name, email or phone…"
        facetedFilters={[
          { columnId: "agency_role", title: "Role", options: ROLE_OPTIONS },
        ]}
        initialSorting={[{ id: "created_at", desc: true }]}
      />
    </div>
  );
}
