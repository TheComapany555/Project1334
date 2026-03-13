"use client";

import type { Payment } from "@/lib/types/payments";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime } from "@/lib/utils";

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type Props = {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function PaymentDetailModal({ payment, open, onOpenChange }: Props) {
  if (!payment) return null;

  const listing = Array.isArray(payment.listing) ? payment.listing[0] : payment.listing;
  const broker = Array.isArray(payment.broker) ? payment.broker[0] : payment.broker;
  const product = Array.isArray(payment.product) ? payment.product[0] : payment.product;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Payment Details</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-0 divide-y divide-border">
          <DetailRow label="Payment ID" value={
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {payment.id.slice(0, 8)}…
            </code>
          } />
          <DetailRow label="Status" value={<StatusBadge status={payment.status} />} />
          <DetailRow label="Amount" value={
            payment.amount > 0 ? formatAmount(payment.amount, payment.currency) : "—"
          } />
          <DetailRow label="Currency" value={payment.currency.toUpperCase()} />
          <DetailRow label="Product" value={
            product ? (
              <Badge variant="outline" className="text-xs">{product.name}</Badge>
            ) : (
              `${payment.package_days} days`
            )
          } />
        </div>

        <Separator />

        <div className="space-y-0 divide-y divide-border">
          <DetailRow label="Listing" value={listing?.title ?? "—"} />
          <DetailRow label="Broker" value={
            broker ? (broker.name ?? broker.company ?? "—") : (payment.agency_id ? "Agency" : "—")
          } />
          {payment.agency_id && (
            <DetailRow label="Paid by" value={<Badge variant="outline" className="text-xs">Agency</Badge>} />
          )}
        </div>

        <Separator />

        <div className="space-y-0 divide-y divide-border">
          <DetailRow label="Created" value={formatDateTime(payment.created_at)} />
          {payment.paid_at && (
            <DetailRow label="Paid at" value={formatDateTime(payment.paid_at)} />
          )}
          {payment.stripe_session_id && (
            <DetailRow label="Stripe Session" value={
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {payment.stripe_session_id.slice(0, 16)}…
              </code>
            } />
          )}
          {payment.stripe_payment_intent && (
            <DetailRow label="Payment Intent" value={
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {payment.stripe_payment_intent.slice(0, 16)}…
              </code>
            } />
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
