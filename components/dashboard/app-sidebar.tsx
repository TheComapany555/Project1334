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
import { Button } from "@/components/ui/button";

const brokerNav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
  { label: "Listings", href: "/dashboard/listings", icon: FileIcon },
  { label: "Enquiries", href: "/dashboard/enquiries", icon: MailIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Salebiz Broker">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/Salebiz.png"
                  alt="Salebiz"
                  width={100}
                  height={30}
                  className="h-7 w-auto object-contain"
                />
                <span className="text-xs font-medium text-muted-foreground">Broker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {brokerNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
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
