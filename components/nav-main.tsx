"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignCircleIcon, Mail01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="px-2 py-3">
      <SidebarGroupContent className="flex flex-col gap-3">

        {/* ── Quick actions ── */}
        <div className="flex flex-col gap-1.5">
          {/* Add listing — primary CTA */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Add listing"
                className="h-9 rounded-lg gap-2.5 bg-[#1a5c38] text-white hover:bg-[#144a2d] hover:text-white active:bg-[#144a2d] active:text-white font-medium shadow-sm transition-colors duration-150"
              >
                <Link href="/dashboard/listings/new">
                  <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4 shrink-0" />
                  <span>Add listing</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Enquiries — secondary shortcut */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Enquiries"
                className={cn(
                  "h-9 rounded-lg gap-2.5 transition-colors duration-150",
                  pathname === "/dashboard/enquiries" || pathname.startsWith("/dashboard/enquiries/")
                    ? "bg-[#1a5c38]/10 text-[#1a5c38] dark:bg-[#4ade80]/10 dark:text-[#4ade80] font-medium"
                    : "hover:bg-sidebar-accent"
                )}
              >
                <Link href="/dashboard/enquiries">
                  <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4 shrink-0" />
                  <span>Enquiries</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <SidebarSeparator />

        {/* ── Main nav ── */}
        <div className="flex flex-col gap-0.5">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 mb-1 group-data-[collapsible=icon]:hidden">
            Menu
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {items.map((item) => {
              const isDashboardRoot = item.url === "/dashboard"
              const isActive = isDashboardRoot
                ? pathname === "/dashboard"
                : pathname === item.url || pathname.startsWith(item.url + "/")
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className={cn(
                      "h-9 rounded-lg gap-2.5 transition-colors duration-150",
                      isActive
                        ? "bg-[#1a5c38]/10 text-[#1a5c38] dark:bg-[#4ade80]/10 dark:text-[#4ade80] font-medium"
                        : "hover:bg-sidebar-accent"
                    )}
                  >
                    <Link href={item.url} prefetch={false}>
                      {item.icon}
                      <span>{item.title}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1a5c38] dark:bg-[#4ade80] shrink-0 group-data-[collapsible=icon]:hidden" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>

      </SidebarGroupContent>
    </SidebarGroup>
  )
}