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
import { Badge } from "@/components/ui/badge"
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
import {
  UserCircle02Icon,
  Logout01Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavUser({
  user,
  profileSlug,
  role,
}: {
  user: { name: string; email: string; avatar: string }
  profileSlug?: string
  role?: "broker" | "admin"
}) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { isMobile } = useSidebar()
  const initial = (user.name || user.email).charAt(0).toUpperCase()

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
              <Avatar className="h-8 w-8 rounded-full ring-2 ring-[#1a5c38]/20 dark:ring-[#4ade80]/20 shrink-0">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-full bg-[#1a5c38]/15 text-[#1a5c38] dark:bg-[#4ade80]/15 dark:text-[#4ade80] text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>

              <ChevronUp className="ml-auto size-3.5 text-muted-foreground shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            {/* User info header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3">
                <Avatar className="h-10 w-10 rounded-full ring-2 ring-[#1a5c38]/20 dark:ring-[#4ade80]/20 shrink-0">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-[#1a5c38]/15 text-[#1a5c38] dark:bg-[#4ade80]/15 dark:text-[#4ade80] font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 min-w-0 gap-0.5">
                  <span className="truncate text-sm font-semibold">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                  {role && (
                    <Badge
                      variant="secondary"
                      className="w-fit text-[10px] px-1.5 py-0 mt-1 capitalize font-medium"
                    >
                      {role}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {role === "broker" && (
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

                {profileSlug && (
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
                )}

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