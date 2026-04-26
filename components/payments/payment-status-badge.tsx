import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/types/payments";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  pending: "warning",
  invoiced: "warning",
  approved: "secondary",
  paid: "success",
};

const LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  invoiced: "Invoiced",
  approved: "Invoice approved",
  paid: "Paid",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={PAYMENT_STATUS_VARIANT[status] ?? "secondary"}>
      {LABELS[status] ?? status}
    </Badge>
  );
}
