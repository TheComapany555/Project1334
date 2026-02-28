"use client"

import Image from "next/image"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutDashboard, UserIcon, FileIcon } from "@hugeicons/core-free-icons"

export type SidebarUser = {
  name: string | null
  email: string
  role: "broker" | "admin"
  profileSlug?: string
  photoUrl?: string | null
}

const brokerNavMain = [
  { title: "Overview", url: "/dashboard", icon: <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2} /> },
  { title: "Profile", url: "/dashboard/profile", icon: <HugeiconsIcon icon={UserIcon} strokeWidth={2} /> },
  { title: "Listings", url: "/dashboard/listings", icon: <HugeiconsIcon icon={FileIcon} strokeWidth={2} /> },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser }) {
  const navUser = {
    name: user.name ?? user.email ?? "Account",
    email: user.email,
    avatar: user.photoUrl ?? "",
  }

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/dashboard" aria-label="Salebiz home">
                <Image src="/Salebizsvg.svg" alt="" width={100} height={30} className="h-7 w-auto object-contain" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={brokerNavMain} />
        <SidebarMenu className="mt-auto">
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2 p-2">
              <ThemeSwitcher />
              <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">Theme</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} profileSlug={user.profileSlug} role={user.role} />
      </SidebarFooter>
    </Sidebar>
  )
}
