"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  MessageMultipleIcon,
  Activity01Icon,
  CheckListIcon,
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
  { title: "Listings", url: "/dashboard/listings", icon: <HugeiconsIcon icon={FileIcon} strokeWidth={2} /> },
  { title: "Enquiries", url: "/dashboard/enquiries", icon: <HugeiconsIcon icon={MailIcon} strokeWidth={2} /> },
  { title: "CRM", url: "/dashboard/contacts", icon: <HugeiconsIcon icon={UserMultipleIcon} strokeWidth={2} /> },
  { title: "Follow-ups", url: "/dashboard/follow-ups", icon: <HugeiconsIcon icon={CheckListIcon} strokeWidth={2} /> },
  { title: "Activity", url: "/dashboard/activity", icon: <HugeiconsIcon icon={Activity01Icon} strokeWidth={2} /> },
  { title: "Messages", url: "/dashboard/messages", icon: <HugeiconsIcon icon={MessageMultipleIcon} strokeWidth={2} /> },
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
  const pathname = usePathname()
  const workspaceActive = workspaceActivePaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )

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
            <SidebarMenuButton
              asChild
              tooltip="Workspace"
              isActive={workspaceActive}
              className="transition-colors duration-150 data-[active=true]:font-medium"
            >
              <Link href="/dashboard/workspace" prefetch={false}>
                <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />
                <span>Workspace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
