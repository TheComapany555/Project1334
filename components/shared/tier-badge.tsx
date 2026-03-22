import { Badge } from "@/components/ui/badge";
import type { ListingTier } from "@/lib/types/listings";

const tierConfig: Record<ListingTier, { label: string; className: string }> = {
  basic: { label: "Basic", className: "bg-muted text-muted-foreground border-border" },
  standard: { label: "Standard", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  featured: { label: "Featured", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
};

export function TierBadge({ tier, className = "" }: { tier: ListingTier; className?: string }) {
  const config = tierConfig[tier];
  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}
