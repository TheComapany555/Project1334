import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  published: "success",
  active: "success",
  approved: "success",
  verified: "success",
  draft: "warning",
  pending: "warning",
  under_offer: "warning",
  sold: "destructive",
  removed: "destructive",
  disabled: "destructive",
  rejected: "destructive",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const variant = STATUS_VARIANT_MAP[status] ?? "secondary";
  const display = label ?? status.replace(/_/g, " ");
  return (
    <Badge variant={variant} className={className}>
      {display}
    </Badge>
  );
}
