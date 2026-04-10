"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface CallTrackingButtonProps {
  phone: string;
  listingId?: string;
  brokerId?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  children?: React.ReactNode;
}

export function CallTrackingButton({
  phone,
  listingId,
  brokerId,
  className,
  variant = "default",
  children,
}: CallTrackingButtonProps) {
  const handleClick = useCallback(() => {
    // Fire-and-forget tracking
    if (listingId) {
      fetch("/api/track/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, broker_id: brokerId }),
      }).catch(() => {});
    }
  }, [listingId, brokerId]);

  return (
    <Button asChild className={className} variant={variant}>
      <a href={`tel:${phone.replace(/\s/g, "")}`} onClick={handleClick}>
        <Phone className="h-4 w-4" />
        {children ?? phone}
      </a>
    </Button>
  );
}
