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
  FileIcon,
  MailIcon,
  Wallet02Icon,
  Building03Icon,
  SecurityCheckIcon,
  Analytics01Icon,
  UserMultipleIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"

export type SidebarUser = {
  name: string | null
  email: string
  role: "broker" | "admin"
  profileSlug?: string
  photoUrl?: string | null
  agencyRole?: "owner" | "member" | null
  agencyName?: string | null
}

const workspaceActivePaths = [
  "/dashboard/workspace",
  "/dashboard/agency",
  "/dashboard/team",
] as const

const brokerNav = [
  { title: "Overview", url: "/dashboard", icon: <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2} /> },
  {
    title: "Broker Profile",
    url: "/dashboard/profile",
    icon: <HugeiconsIcon icon={UserIcon} strokeWidth={2} />,
  },
  {
    title: "Workspace",
    url: "/dashboard/workspace",
    icon: <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />,
    activeMatchPaths: [...workspaceActivePaths],
  },
  { title: "Listings", url: "/dashboard/listings", icon: <HugeiconsIcon icon={FileIcon} strokeWidth={2} /> },
  { title: "Enquiries", url: "/dashboard/enquiries", icon: <HugeiconsIcon icon={MailIcon} strokeWidth={2} /> },
  { title: "CRM", url: "/dashboard/contacts", icon: <HugeiconsIcon icon={UserMultipleIcon} strokeWidth={2} /> },
  {
    title: "NDAs",
    url: "/dashboard/ndas",
    icon: <HugeiconsIcon icon={SecurityCheckIcon} strokeWidth={2} />,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />,
  },
  { title: "Payments", url: "/dashboard/payments", icon: <HugeiconsIcon icon={Wallet02Icon} strokeWidth={2} /> },
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

  const navItems = brokerNav

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="h-(--header-height) flex items-center justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Salebiz">
              <Link href="/dashboard" aria-label="Salebiz home" className="flex items-center justify-center">
                <Image src={SALEBIZ_LOGO_URL} alt="Salebiz" width={100} height={30} className="h-6 w-auto object-contain" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
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
        <NavUser
          user={navUser}
          profileSlug={user.profileSlug}
          role={user.role}
          agencyRole={user.agencyRole}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
