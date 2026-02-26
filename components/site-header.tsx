"use client"

import Link from "next/link"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { UserCircle02Icon, Logout01Icon } from "@hugeicons/core-free-icons"

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
  const displayName = user?.name?.trim() || user?.email || "Account"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {title ? (
          <h1 className="text-base font-medium">{title}</h1>
        ) : (
          <div className="flex-1" aria-hidden />
        )}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto flex items-center gap-2 rounded-full pe-2 ps-1.5"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.photoUrl ?? undefined} alt="" />
                  <AvatarFallback className="rounded-full text-sm">
                    {(user.name?.trim() || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate text-sm font-medium sm:max-w-[160px]">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 rounded-full">
                    <AvatarImage src={user.photoUrl ?? undefined} alt="" />
                    <AvatarFallback>
                      {(user.name?.trim() || user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
                    <Link href="/dashboard/profile">
                      <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} className="size-4" />
                      Edit profile
                    </Link>
                  </DropdownMenuItem>
                  {user.profileSlug && (
                    <DropdownMenuItem asChild>
                      <Link href={`/broker/${encodeURIComponent(user.profileSlug)}`} target="_blank" rel="noopener noreferrer">
                        <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} className="size-4" />
                        View public profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/" })}>
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
