"use client"

import Image from "next/image"
import Link from "next/link"
import { SALEBIZ_LOGO_URL } from "@/lib/branding"
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
import {
  LayoutDashboard,
  UserIcon,
  FileIcon,
  FolderIcon,
  MailIcon,
  Wallet02Icon,
  Tag01Icon,
  Megaphone01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"

export type AdminSidebarUser = {
  name: string | null
  email: string
  role: "broker" | "admin"
  photoUrl?: string | null
}

const adminNav = [
  { title: "Overview", url: "/admin", icon: <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2} /> },
  { title: "Agencies", url: "/admin/brokers", icon: <HugeiconsIcon icon={UserIcon} strokeWidth={2} /> },
  { title: "Listings", url: "/admin/listings", icon: <HugeiconsIcon icon={FileIcon} strokeWidth={2} /> },
  { title: "Categories", url: "/admin/categories", icon: <HugeiconsIcon icon={FolderIcon} strokeWidth={2} /> },
  { title: "Enquiries", url: "/admin/enquiries", icon: <HugeiconsIcon icon={MailIcon} strokeWidth={2} /> },
  { title: "Pricing & Plans", url: "/admin/products", icon: <HugeiconsIcon icon={Tag01Icon} strokeWidth={2} /> },
  { title: "Payments & Subscriptions", url: "/admin/payments", icon: <HugeiconsIcon icon={Wallet02Icon} strokeWidth={2} /> },
  { title: "NDA Signatures", url: "/admin/ndas", icon: <HugeiconsIcon icon={SecurityCheckIcon} strokeWidth={2} /> },
  { title: "Advertising", url: "/admin/advertising", icon: <HugeiconsIcon icon={Megaphone01Icon} strokeWidth={2} /> },
]

export function AdminSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: AdminSidebarUser }) {
  const navUser = {
    name: user.name ?? user.email ?? "Admin",
    email: user.email,
    avatar: user.photoUrl ?? "",
  }

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="h-(--header-height) flex items-center justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Salebiz Admin">
              <Link href="/admin" aria-label="Salebiz Admin" className="flex items-center justify-center">
                <Image src={SALEBIZ_LOGO_URL} alt="Salebiz" width={100} height={30} className="h-6 w-auto object-contain" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={adminNav} />
        <SidebarMenu className="mt-auto">
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2 p-2">
              <ThemeSwitcher />
              <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">Theme</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={navUser} role={user.role} />
      </SidebarFooter>
    </Sidebar>
  )
}
