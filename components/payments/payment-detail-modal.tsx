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
import { FileText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

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

  const isInvoice = payment.invoice_requested;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
          <DetailRow label="Type" value={
            <Badge variant="outline" className="text-[10px]">
              {payment.payment_type === "listing_tier" ? "Listing Tier" :
               payment.payment_type === "subscription" ? "Subscription" : "Featured"}
            </Badge>
          } />
          <DetailRow label="Amount" value={
            payment.amount > 0 ? formatAmount(payment.amount, payment.currency) : "Free"
          } />
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
        </div>

        {isInvoice && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Invoice Request</span>
              </div>
              <div className="space-y-0 divide-y divide-border">
                {payment.invoice_requested_at && (
                  <DetailRow label="Requested" value={formatDateTime(payment.invoice_requested_at)} />
                )}
                {payment.invoice_notes && (
                  <DetailRow label="Notes" value={
                    <p className="text-xs text-muted-foreground max-w-[200px] text-right whitespace-pre-wrap">
                      {payment.invoice_notes}
                    </p>
                  } />
                )}
                {payment.invoice_admin_notes && (
                  <DetailRow label="Admin notes" value={
                    <p className="text-xs text-muted-foreground max-w-[200px] text-right">
                      {payment.invoice_admin_notes}
                    </p>
                  } />
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-0 divide-y divide-border">
          <DetailRow label="Created" value={formatDateTime(payment.created_at)} />
          {payment.paid_at && (
            <DetailRow label="Paid at" value={formatDateTime(payment.paid_at)} />
          )}
          {payment.stripe_payment_intent && (
            <DetailRow label="Stripe PI" value={
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
