"use client"

import { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { Logout01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavUser({
  user,
  profileSlug,
  role,
  agencyRole,
}: {
  user: { name: string; email: string; avatar: string }
  profileSlug?: string
  role?: "broker" | "admin"
  agencyRole?: "owner" | "member" | null
}) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { isMobile } = useSidebar()

  // Prefer the broker's profile name. If a broker hasn't set a name yet,
  // fall back to the local part of their email (e.g. "aamirdeveloper07@…"
  // → "aamirdeveloper07") rather than dumping the whole address in the
  // sidebar — keeps the chrome clean while still being identifiable.
  const displayName =
    user.name?.trim() || user.email.split("@")[0] || "Account"
  const initial = displayName.charAt(0).toUpperCase()

  // Humanise the role label for the dropdown header — no underscores, no
  // database keys leaking into the UI.
  const roleLabel =
    role === "admin"
      ? "Admin"
      : agencyRole === "owner"
        ? "Agency owner"
        : agencyRole === "member"
          ? "Agency member"
          : role === "broker"
            ? "Broker"
            : null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "h-11 rounded-lg gap-3 transition-colors duration-150",
                "hover:bg-sidebar-accent",
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              )}
            >
              <Avatar className="h-8 w-8 rounded-full ring-2 ring-primary/20 shrink-0">
                <AvatarImage src={user.avatar || undefined} alt={displayName} />
                <AvatarFallback className="rounded-full bg-primary/15 text-primary text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <span className="flex-1 truncate text-left text-sm font-semibold text-sidebar-foreground">
                {displayName}
              </span>

              <ChevronUp className="ml-auto size-3.5 text-muted-foreground shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            {/* User info header — name + humanised role only. Email is
                intentionally omitted; the user knows who they are signed in
                as, and the row is visually tighter without it. */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3">
                <Avatar className="h-10 w-10 rounded-full ring-2 ring-primary/20 shrink-0">
                  <AvatarImage src={user.avatar || undefined} alt={displayName} />
                  <AvatarFallback className="rounded-full bg-primary/15 text-primary font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 min-w-0 gap-0.5 leading-tight">
                  <span className="truncate text-sm font-semibold">
                    {displayName}
                  </span>
                  {roleLabel && (
                    <span className="truncate text-xs text-muted-foreground">
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {role === "broker" && profileSlug && (
              <>
                <DropdownMenuItem asChild className="gap-2.5 cursor-pointer">
                  <Link
                    href={`/broker/${encodeURIComponent(profileSlug)}`}
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

                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              className="gap-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/8"
              onSelect={() => setLogoutOpen(true)}
            >
              <HugeiconsIcon
                icon={Logout01Icon}
                strokeWidth={2}
                className="size-4"
              />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </SidebarMenu>
  )
}