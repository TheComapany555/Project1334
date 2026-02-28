"use client"

import { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  UserCircle02Icon,
  Logout01Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons"
import { ChevronDown } from "lucide-react"

export type HeaderUser = {
  name: string | null
  email: string
  role: "broker" | "admin"
  profileSlug?: string
  photoUrl?: string | null
}

export function SiteHeader({
  title,
  user,
}: {
  title?: string
  user?: HeaderUser
}) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const displayName = user?.name?.trim() || user?.email || "Account"
  const initial = (user?.name?.trim() || user?.email || "?").charAt(0).toUpperCase()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        {/* Sidebar trigger + divider */}
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 bg-border/60" />

        {/* Page title */}
        {title ? (
          <h1 className="text-sm font-semibold text-foreground tracking-tight">{title}</h1>
        ) : (
          <div className="flex-1" aria-hidden />
        )}

        {/* Right side spacer when title present */}
        {title && <div className="flex-1" aria-hidden />}

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-9 flex items-center gap-2 rounded-full pl-1.5 pr-2.5 hover:bg-muted transition-colors"
                aria-label="Account menu"
              >
                <Avatar className="h-7 w-7 rounded-full ring-2 ring-[#1a5c38]/20 dark:ring-[#4ade80]/20 shrink-0">
                  <AvatarImage src={user.photoUrl ?? undefined} alt="" />
                  <AvatarFallback className="rounded-full bg-[#1a5c38]/15 text-[#1a5c38] dark:bg-[#4ade80]/15 dark:text-[#4ade80] text-xs font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium">
                  {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 rounded-xl shadow-lg">
              {/* User info header */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar className="h-10 w-10 rounded-full ring-2 ring-[#1a5c38]/20 dark:ring-[#4ade80]/20 shrink-0">
                    <AvatarImage src={user.photoUrl ?? undefined} alt="" />
                    <AvatarFallback className="rounded-full bg-[#1a5c38]/15 text-[#1a5c38] dark:bg-[#4ade80]/15 dark:text-[#4ade80] font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 grid gap-0.5">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <Badge
                      variant="secondary"
                      className="w-fit text-[10px] px-1.5 py-0 mt-0.5 capitalize font-medium"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {user.role === "broker" && (
                <>
                  <DropdownMenuItem asChild className="gap-2.5 cursor-pointer">
                    <Link href="/dashboard/profile">
                      <HugeiconsIcon
                        icon={UserCircle02Icon}
                        strokeWidth={2}
                        className="size-4 text-muted-foreground"
                      />
                      Edit profile
                    </Link>
                  </DropdownMenuItem>
                  {user.profileSlug && (
                    <DropdownMenuItem asChild className="gap-2.5 cursor-pointer">
                      <Link
                        href={`/broker/${encodeURIComponent(user.profileSlug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <HugeiconsIcon
                          icon={LinkSquare02Icon}
                          strokeWidth={2}
                          className="size-4 text-muted-foreground"
                        />
                        View public profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/8"
                onSelect={() => setLogoutOpen(true)}
              >
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </header>
  )
}