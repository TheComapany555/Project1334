"use client";

import Link from "next/link";
import type { Payment } from "@/lib/types/payments";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type PaymentHistoryProps = {
  payments: Payment[];
  showBroker?: boolean;
};

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function PaymentHistory({ payments, showBroker = false }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Listing</TableHead>
          {showBroker && <TableHead>Broker</TableHead>}
          <TableHead>Package</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => {
          const listing = Array.isArray(payment.listing)
            ? payment.listing[0]
            : payment.listing;
          const broker = Array.isArray(payment.broker)
            ? payment.broker[0]
            : payment.broker;

          return (
            <TableRow key={payment.id}>
              <TableCell>
                {listing ? (
                  <Link
                    href={`/listing/${listing.slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {listing.title}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              {showBroker && (
                <TableCell>
                  <span className="text-sm">
                    {broker?.name ?? broker?.company ?? "—"}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {(() => {
                    const prod = Array.isArray(payment.product) ? payment.product[0] : payment.product;
                    return prod?.name ?? `${payment.package_days} days`;
                  })()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <PaymentStatusBadge status={payment.status} />
                  {payment.invoice_requested && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 dark:text-amber-400">
                      Invoice
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-sm font-medium">
                {payment.amount > 0
                  ? formatAmount(payment.amount, payment.currency)
                  : "—"}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDate(payment.created_at)}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
