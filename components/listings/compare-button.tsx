"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { GitCompareArrows, Check } from "lucide-react";
import { addToComparison, removeFromComparison } from "@/lib/actions/comparison";

type Props = {
  listingId: string;
  isInComparison: boolean;
  isLoggedIn: boolean;
  size?: "default" | "sm" | "icon-sm";
};

export function CompareButton({
  listingId,
  isInComparison: initial,
  isLoggedIn,
  size = "sm",
}: Props) {
  const [inComparison, setInComparison] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    if (!isLoggedIn) {
      window.location.href = "/auth/login";
      return;
    }
    setError(null);

    startTransition(async () => {
      if (inComparison) {
        const result = await removeFromComparison(listingId);
        if (result.ok) setInComparison(false);
      } else {
        const result = await addToComparison(listingId);
        if (result.ok) {
          setInComparison(true);
        } else {
          setError(result.error);
          setTimeout(() => setError(null), 3000);
        }
      }
    });
  };

  if (size === "icon-sm") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
        disabled={isPending}
        title={error ?? (inComparison ? "Remove from comparison" : "Add to compare")}
        aria-label={inComparison ? "Remove from comparison" : "Add to compare"}
      >
        {inComparison ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={inComparison ? "secondary" : "outline"}
      size={size}
      onClick={handleToggle}
      disabled={isPending}
      title={error ?? undefined}
    >
      {inComparison ? (
        <Check className="h-4 w-4 mr-1.5 text-primary" />
      ) : (
        <GitCompareArrows className="h-4 w-4 mr-1.5" />
      )}
      {inComparison ? "Comparing" : "Compare"}
    </Button>
  );
}
