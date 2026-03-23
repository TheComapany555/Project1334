"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Payment, PaymentStatus } from "@/lib/types/payments";
import { updatePaymentStatus } from "@/lib/actions/payments";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentDetailModal } from "./payment-detail-modal";
import { formatDate } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "invoiced", label: "Invoiced" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
] as const;

const STATUS_OPTIONS: PaymentStatus[] = ["pending", "invoiced", "approved", "paid"];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
] as const;

const PAGE_SIZE = 10;

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

type Props = {
  payments: Payment[];
  showBroker?: boolean;
  showActions?: boolean;
};

export function PaymentLogsTable({ payments, showBroker = false, showActions = false }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const filtered = useMemo(() => {
    let result = payments;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const days = Number(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((p) => new Date(p.created_at) >= cutoff);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const listing = Array.isArray(p.listing) ? p.listing[0] : p.listing;
        const broker = Array.isArray(p.broker) ? p.broker[0] : p.broker;
        const product = Array.isArray(p.product) ? p.product[0] : p.product;
        return (
          p.id.toLowerCase().includes(q) ||
          listing?.title?.toLowerCase().includes(q) ||
          broker?.name?.toLowerCase().includes(q) ||
          broker?.company?.toLowerCase().includes(q) ||
          product?.name?.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [payments, statusFilter, dateRange, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useMemo(() => setPage(1), [statusFilter, dateRange, search]);

  async function onStatusChange(paymentId: string, newStatus: PaymentStatus) {
    const res = await updatePaymentStatus(paymentId, newStatus);
    if (res.ok) {
      toast.success("Payment status updated");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update");
    }
  }

  function exportCSV() {
    const headers = [
      "Payment ID", "Date", "Product", "Listing", "Broker", "Amount", "Currency", "Status",
      "Stripe Session ID", "Stripe Payment Intent",
    ];
    const rows = filtered.map((p) => {
      const listing = Array.isArray(p.listing) ? p.listing[0] : p.listing;
      const broker = Array.isArray(p.broker) ? p.broker[0] : p.broker;
      const product = Array.isArray(p.product) ? p.product[0] : p.product;
      return [
        p.id,
        p.created_at,
        product?.name ?? `${p.package_days} days`,
        listing?.title ?? "",
        broker?.name ?? broker?.company ?? "",
        (p.amount / 100).toFixed(2),
        p.currency.toUpperCase(),
        p.status,
        p.stripe_session_id ?? "",
        p.stripe_payment_intent ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center px-4 sm:px-6 pt-4 pb-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by listing, broker, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Results info */}
      <div className="px-4 sm:px-6 pb-2">
        <p className="text-xs text-muted-foreground">
          {filtered.length === payments.length
            ? `${payments.length} transactions`
            : `Showing ${filtered.length} of ${payments.length} transactions`}
        </p>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No payments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Listing</TableHead>
                {showBroker && <TableHead>Paid by</TableHead>}
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {showActions && <TableHead>Update</TableHead>}
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((payment) => {
                const listing = Array.isArray(payment.listing) ? payment.listing[0] : payment.listing;
                const broker = Array.isArray(payment.broker) ? payment.broker[0] : payment.broker;
                const product = Array.isArray(payment.product) ? payment.product[0] : payment.product;

                return (
                  <TableRow
                    key={payment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <TableCell>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(payment.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {listing ? (
                        <Link
                          href={`/listing/${listing.slug}`}
                          className="text-sm font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {listing.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {showBroker && (
                      <TableCell>
                        <div className="text-sm">
                          {payment.agency_id ? (
                            <Badge variant="outline" className="text-xs">Agency</Badge>
                          ) : (
                            <span>{broker?.name ?? broker?.company ?? "—"}</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {product?.name ?? `${payment.package_days} days`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={payment.status} />
                        {payment.invoice_requested && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 dark:text-amber-400">
                            Invoice
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium whitespace-nowrap">
                      {payment.amount > 0 ? formatAmount(payment.amount, payment.currency) : "—"}
                    </TableCell>
                    {showActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={payment.status}
                          onValueChange={(v) => onStatusChange(payment.id, v as PaymentStatus)}
                        >
                          <SelectTrigger className="h-8 w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPayment(payment);
                        }}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <PaymentDetailModal
        payment={selectedPayment}
        open={!!selectedPayment}
        onOpenChange={(open) => { if (!open) setSelectedPayment(null); }}
        showActions={showActions}
      />
    </>
  );
}
