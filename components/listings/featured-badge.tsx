import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FeaturedBadgeProps = {
  className?: string;
  size?: "sm" | "default";
};

export function FeaturedBadge({ className, size = "default" }: FeaturedBadgeProps) {
  return (
    <Badge
      variant="default"
      className={cn(
        "gap-1 bg-amber-500 text-white hover:bg-amber-500 border-amber-500",
        size === "sm" && "text-[10px] px-1.5 py-0 h-5",
        className
      )}
    >
      <Star className={cn("fill-current", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      Featured
    </Badge>
  );
}

/** Check if a listing is currently featured based on featured_until. */
export function isFeaturedNow(featuredUntil: string | null): boolean {
  if (!featuredUntil) return false;
  return new Date(featuredUntil) > new Date();
}
