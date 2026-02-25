"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LayoutDashboard,
  UserIcon,
  FileIcon,
  FolderIcon,
  MailIcon,
  LogoutIcon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";

const adminNav = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Brokers", href: "/admin/brokers", icon: UserIcon },
  { label: "Listings", href: "/admin/listings", icon: FileIcon },
  { label: "Categories", href: "/admin/categories", icon: FolderIcon },
  { label: "Enquiries", href: "/admin/enquiries", icon: MailIcon },
] as const;

export function AdminAppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Salebiz Admin">
              <Link href="/admin" className="flex items-center gap-2">
                <Image
                  src="/Salebiz.png"
                  alt="Salebiz"
                  width={100}
                  height={30}
                  className="h-7 w-auto object-contain"
                />
                <span className="text-xs font-medium text-muted-foreground">Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => {
                const isAdminRoot = item.href === "/admin";
                const isActive = isAdminRoot
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Broker dashboard">
              <Link href="/dashboard">
                <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2} />
                <span>Broker dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2 p-2">
              <ThemeSwitcher />
              <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">Theme</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={() => signOut({ callbackUrl: "/" })}>
              <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
