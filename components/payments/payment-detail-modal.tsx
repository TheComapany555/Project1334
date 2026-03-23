"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Payment, PaymentStatus } from "@/lib/types/payments";
import { updatePaymentStatus, updatePaymentAdminNotes } from "@/lib/actions/payments";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, CheckCircle, CreditCard } from "lucide-react";
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
  showActions?: boolean;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function PaymentDetailModal({ payment, open, onOpenChange, showActions = false }: Props) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(payment?.invoice_admin_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  if (!payment) return null;

  const listing = Array.isArray(payment.listing) ? payment.listing[0] : payment.listing;
  const broker = Array.isArray(payment.broker) ? payment.broker[0] : payment.broker;
  const product = Array.isArray(payment.product) ? payment.product[0] : payment.product;

  const isInvoice = payment.invoice_requested;
  const canApprove = isInvoice && payment.status === "invoiced";
  const canMarkPaid = payment.status === "invoiced" || payment.status === "approved";

  async function handleStatusChange(newStatus: PaymentStatus) {
    setChangingStatus(newStatus);
    const result = await updatePaymentStatus(payment!.id, newStatus);
    setChangingStatus(null);
    if (result.ok) {
      toast.success(`Payment marked as ${newStatus}`);
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Failed to update status.");
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const result = await updatePaymentAdminNotes(payment!.id, adminNotes);
    setSavingNotes(false);
    if (result.ok) {
      toast.success("Admin notes saved.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to save notes.");
    }
  }

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

        {/* Invoice section */}
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
                  <DetailRow label="Agency notes" value={
                    <p className="text-xs text-muted-foreground max-w-[200px] text-right whitespace-pre-wrap">
                      {payment.invoice_notes}
                    </p>
                  } />
                )}
              </div>

              {/* Admin notes (editable) */}
              {showActions && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Admin notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Invoice sent via Xero on…"
                    className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    maxLength={500}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="w-full"
                  >
                    {savingNotes && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                    Save notes
                  </Button>
                </div>
              )}

              {!showActions && payment.invoice_admin_notes && (
                <DetailRow label="Admin notes" value={
                  <p className="text-xs text-muted-foreground max-w-[200px] text-right">
                    {payment.invoice_admin_notes}
                  </p>
                } />
              )}
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

        {/* Admin action buttons */}
        {showActions && (canApprove || canMarkPaid) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Actions</p>
              <div className="flex gap-2">
                {canApprove && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleStatusChange("approved")}
                    disabled={!!changingStatus}
                  >
                    {changingStatus === "approved" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    Approve
                  </Button>
                )}
                {canMarkPaid && (
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleStatusChange("paid")}
                    disabled={!!changingStatus}
                  >
                    {changingStatus === "paid" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CreditCard className="h-3 w-3" />
                    )}
                    Mark as paid
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
