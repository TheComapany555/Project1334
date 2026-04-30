"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Building2,
  Heart,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

type Role = "broker" | "admin" | "user";

type Props = {
  user: {
    name?: string | null;
    email: string;
    role: Role;
    photoUrl?: string | null;
  };
  /** Compact button (icon only) for tight nav space. */
  compact?: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  user: "Buyer",
  broker: "Broker",
  admin: "Admin",
};

export function UserMenu({ user, compact = false }: Props) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const displayName = user.name?.trim() || user.email.split("@")[0];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open account menu"
            className={cn(
              "inline-flex items-center gap-2 rounded-full transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compact
                ? "p-0.5 hover:bg-muted"
                : "h-9 pl-1 pr-3 hover:bg-muted",
            )}
          >
            <UserAvatar
              name={user.name ?? null}
              email={user.email}
              photoUrl={user.photoUrl ?? null}
              className="size-8"
            />
            {!compact && (
              <span className="hidden md:inline text-sm font-medium text-foreground max-w-[140px] truncate">
                {displayName}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64"
        >
          {/* Header — name + email + role chip */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={user.name ?? null}
                email={user.email}
                photoUrl={user.photoUrl ?? null}
                className="size-10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5",
                  user.role === "admin"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    : user.role === "broker"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                )}
              >
                {ROLE_LABEL[user.role]} account
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Buyer items */}
          {user.role === "user" && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <UserIcon className="h-4 w-4" />
                  Your account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/saved">
                  <Heart className="h-4 w-4" />
                  Saved listings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/compare">
                  <GitCompareArrows className="h-4 w-4" />
                  Compare
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {/* Broker items */}
          {user.role === "broker" && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <UserIcon className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/listings">
                  <Building2 className="h-4 w-4" />
                  Listings
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {/* Admin items */}
          {user.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                Admin panel
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Theme toggle as a row (clickable area is the switch itself) */}
          <div className="px-2 py-1.5 flex items-center justify-between gap-2">
            <span className="text-sm">Theme</span>
            <ThemeSwitcher />
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setLogoutOpen(true);
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </>
  );
}
