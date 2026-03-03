"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string | null;
  email: string;
  photoUrl?: string | null;
  className?: string;
};

export function UserAvatar({ name, email, photoUrl, className }: UserAvatarProps) {
  if (photoUrl) {
    return (
      <span className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}>
        <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
      </span>
    );
  }
  const initial = (name?.trim() || email).charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-medium",
        className
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
