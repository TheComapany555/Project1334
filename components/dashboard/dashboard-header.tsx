"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, LogoutIcon } from "@hugeicons/core-free-icons";
import { UserAvatar } from "@/components/shared/user-avatar";
import { NotificationBell } from "@/components/dashboard/notification-bell";

type SidebarUser = {
  name: string | null;
  email: string;
  role: "broker" | "admin";
  profileSlug?: string;
  photoUrl?: string | null;
};

type Props = {
  title?: string;
  description?: string;
  user?: SidebarUser;
};

export function DashboardHeader({ title, description, user }: Props) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const displayName = user?.name?.trim() || user?.email || "Account";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
      <SidebarTrigger />
      {title ? (
        <div className="flex flex-1 flex-col gap-0.5">
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      ) : (
        <div className="flex-1" aria-hidden />
      )}
      {user && (
        <div className="flex items-center gap-1">
          <NotificationBell role={user.role} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 rounded-full pe-2 ps-1.5"
                aria-label="Account menu"
              >
                <UserAvatar name={user.name} email={user.email} photoUrl={user.photoUrl} />
                <span className="max-w-[120px] truncate text-sm font-medium sm:max-w-[160px]">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3">
                  <UserAvatar name={user.name} email={user.email} photoUrl={user.photoUrl} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.role === "broker" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/workspace">
                      <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
                      Workspace
                    </Link>
                  </DropdownMenuItem>
                  {user.profileSlug && (
                    <DropdownMenuItem asChild>
                      <Link href={`/broker/${encodeURIComponent(user.profileSlug)}`} target="_blank" rel="noopener noreferrer">
                        <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
                        View public profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
                    Admin overview
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setLogoutOpen(true)}
              >
                <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </header>
  );
}
