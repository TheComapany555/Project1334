"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/lib/actions/favorites";

type Props = {
  listingId: string;
  isFavorited: boolean;
  isLoggedIn: boolean;
  size?: "default" | "sm" | "icon-sm";
};

export function FavoriteButton({
  listingId,
  isFavorited: initialFavorited,
  isLoggedIn,
  size = "sm",
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (!isLoggedIn) {
      window.location.href = "/auth/login";
      return;
    }

    startTransition(async () => {
      const result = await toggleFavorite(listingId);
      if (result.ok) {
        setFavorited(result.isFavorited);
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
        aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      >
        <Heart
          className={`h-4 w-4 ${
            favorited
              ? "fill-red-500 text-red-500"
              : "text-muted-foreground"
          }`}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={favorited ? "secondary" : "outline"}
      size={size}
      onClick={handleToggle}
      disabled={isPending}
    >
      <Heart
        className={`h-4 w-4 mr-1.5 ${
          favorited ? "fill-red-500 text-red-500" : ""
        }`}
      />
      {favorited ? "Saved" : "Save"}
    </Button>
  );
}
