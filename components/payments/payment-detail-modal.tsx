"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Payment } from "@/lib/types/payments";
import {
  updatePaymentAdminNotes,
  updatePaymentStatus,
} from "@/lib/actions/payments";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

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
  /** When true, show invoice workflow actions and admin notes (admin payments page only). */
  enableAdminActions?: boolean;
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function PaymentDetailModal({
  payment,
  open,
  onOpenChange,
  enableAdminActions = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"approve" | "paid" | null>(null);

  useEffect(() => {
    if (payment?.invoice_admin_notes != null) {
      setNotesDraft(payment.invoice_admin_notes);
    } else {
      setNotesDraft("");
    }
  }, [payment?.id, payment?.invoice_admin_notes]);

  if (!payment) return null;

  const paymentRow = payment;

  const listing = Array.isArray(paymentRow.listing)
    ? paymentRow.listing[0]
    : paymentRow.listing;
  const broker = Array.isArray(paymentRow.broker)
    ? paymentRow.broker[0]
    : paymentRow.broker;
  const product = Array.isArray(paymentRow.product)
    ? paymentRow.product[0]
    : paymentRow.product;

  const isInvoice = paymentRow.invoice_requested;
  const canApproveInvoice =
    enableAdminActions && isInvoice && paymentRow.status === "invoiced";
  const canMarkPaid =
    enableAdminActions &&
    paymentRow.status !== "paid" &&
    ["pending", "invoiced", "approved"].includes(paymentRow.status);

  async function saveNotes() {
    setSavingNotes(true);
    const result = await updatePaymentAdminNotes(paymentRow.id, notesDraft);
    setSavingNotes(false);
    if (result.ok) {
      toast.success("Admin notes saved.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not save notes.");
    }
  }

  function runStatusUpdate(status: "approved" | "paid") {
    const id = paymentRow.id;
    startTransition(async () => {
      const result = await updatePaymentStatus(id, status);
      if (result.ok) {
        toast.success(
          status === "paid" ? "Payment marked as paid." : "Invoice approved.",
        );
        setConfirmKind(null);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Update failed.");
      }
    });
  }

  const confirmCopy =
    confirmKind === "approve"
      ? {
          title: "Approve invoice request?",
          description:
            "This confirms you have reviewed the request and will send (or have sent) an invoice. The listing will not go live until payment is marked as received.",
          action: () => runStatusUpdate("approved"),
        }
      : confirmKind === "paid"
        ? {
            title: "Mark payment as received?",
            description:
              "Confirm funds have cleared. Revenue will include this payment, and any linked listing tier or featured purchase will go live.",
            action: () => runStatusUpdate("paid"),
          }
        : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md max-h-[85vh] overflow-y-auto gap-0 p-0"
          showCloseButton
        >
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Payment details</DialogTitle>
          </DialogHeader>

          <div className="px-6 space-y-0 divide-y divide-border">
            <div>
              <DetailRow
                label="Payment ID"
                value={
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    {payment.id.slice(0, 8)}…
                  </code>
                }
              />
              <DetailRow label="Status" value={<PaymentStatusBadge status={payment.status} />} />
              <DetailRow
                label="Type"
                value={
                  <Badge variant="outline" className="text-[10px]">
                    {payment.payment_type === "listing_tier"
                      ? "Listing tier"
                      : payment.payment_type === "subscription"
                        ? "Subscription"
                        : "Featured"}
                  </Badge>
                }
              />
              <DetailRow
                label="Amount"
                value={
                  payment.amount > 0 ? formatAmount(payment.amount, payment.currency) : "Free"
                }
              />
              <DetailRow
                label="Product"
                value={
                  product ? (
                    <Badge variant="outline" className="text-xs">
                      {product.name}
                    </Badge>
                  ) : (
                    `${payment.package_days} days`
                  )
                }
              />
            </div>

            <div className="py-0">
              <DetailRow label="Listing" value={listing?.title ?? "—"} />
              <DetailRow
                label="Broker"
                value={
                  broker
                    ? (broker.name ?? broker.company ?? "—")
                    : payment.agency_id
                      ? "Agency"
                      : "—"
                }
              />
            </div>

            {isInvoice && (
              <div className="py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Invoice request</span>
                </div>
                <div className="space-y-0 divide-y divide-border">
                  {payment.invoice_requested_at && (
                    <DetailRow
                      label="Requested"
                      value={formatDateTime(payment.invoice_requested_at)}
                    />
                  )}
                  {payment.invoice_notes && (
                    <DetailRow
                      label="Notes"
                      value={
                        <p className="text-xs text-muted-foreground max-w-[200px] text-right whitespace-pre-wrap">
                          {payment.invoice_notes}
                        </p>
                      }
                    />
                  )}
                  {payment.invoice_admin_notes && !enableAdminActions && (
                    <DetailRow
                      label="Admin notes"
                      value={
                        <p className="text-xs text-muted-foreground max-w-[200px] text-right">
                          {payment.invoice_admin_notes}
                        </p>
                      }
                    />
                  )}
                </div>
              </div>
            )}

            <div className="py-0">
              <DetailRow label="Created" value={formatDateTime(payment.created_at)} />
              {payment.paid_at && (
                <DetailRow label="Paid at" value={formatDateTime(payment.paid_at)} />
              )}
              {payment.stripe_payment_intent && (
                <DetailRow
                  label="Stripe PI"
                  value={
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {payment.stripe_payment_intent.slice(0, 16)}…
                    </code>
                  }
                />
              )}
            </div>
          </div>

          {enableAdminActions && (
            <>
              <Separator />
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Admin
                </p>
                <div className="space-y-2">
                  <label htmlFor="invoice-admin-notes" className="text-sm font-medium">
                    Internal notes
                  </label>
                  <Textarea
                    id="invoice-admin-notes"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="e.g. Invoice #123 sent via Xero…"
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={savingNotes || notesDraft === (payment.invoice_admin_notes ?? "")}
                    onClick={() => void saveNotes()}
                  >
                    {savingNotes ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Saving…
                      </>
                    ) : (
                      "Save notes"
                    )}
                  </Button>
                </div>

                {(canApproveInvoice || canMarkPaid) && (
                  <div className="flex flex-col gap-2 pt-2">
                    {canApproveInvoice && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isPending}
                        onClick={() => setConfirmKind("approve")}
                      >
                        Approve invoice request
                      </Button>
                    )}
                    {canMarkPaid && (
                      <Button
                        type="button"
                        className="w-full"
                        disabled={isPending}
                        onClick={() => setConfirmKind("paid")}
                      >
                        Mark payment received
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter className="px-6 py-4 border-t sm:justify-start">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmKind} onOpenChange={(o) => !o && setConfirmKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => confirmCopy?.action()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                  Working…
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
