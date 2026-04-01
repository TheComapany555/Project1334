"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type Props = {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "xs";
  className?: string;
  /** For mobile nav: render as a styled link-like element */
  asNavLink?: boolean;
};

export function LogoutButton({
  variant = "ghost",
  size = "sm",
  className,
  asNavLink,
}: Props) {
  const handleLogout = () => signOut({ callbackUrl: "/" });

  if (asNavLink) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-destructive hover:bg-muted transition-colors w-full text-left"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleLogout} className={className}>
      <LogOut className="h-4 w-4 mr-1.5" />
      Sign out
    </Button>
  );
}
