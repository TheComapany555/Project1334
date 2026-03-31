"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LayoutDashboard,
  UserIcon,
  FileIcon,
  MailIcon,
  LogoutIcon,
  ExternalLink,
  Building03Icon,
  Wallet02Icon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";

const workspaceMatchPaths = [
  "/dashboard/workspace",
  "/dashboard/profile",
  "/dashboard/agency",
  "/dashboard/team",
] as const;

const brokerNav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workspace", href: "/dashboard/workspace", icon: Building03Icon },
  { label: "Listings", href: "/dashboard/listings", icon: FileIcon },
  { label: "Enquiries", href: "/dashboard/enquiries", icon: MailIcon },
  { label: "Payments", href: "/dashboard/payments", icon: Wallet02Icon },
] as const;

type SidebarUser = {
  name: string | null;
  email: string;
  role: "broker" | "admin";
  profileSlug?: string;
  photoUrl?: string | null;
  agencyRole?: "owner" | "member" | null;
  agencyName?: string | null;
};

export function AppSidebar({ user }: { user: SidebarUser }) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const displayName = user.name?.trim() || user.email || "Account";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Salebiz">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src={SALEBIZ_LOGO_URL}
                  alt="Salebiz"
                  width={100}
                  height={30}
                  className="h-7 w-auto object-contain"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {user.agencyName ?? "Broker"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {brokerNav.map((item) => {
                const isDashboardRoot = item.href === "/dashboard";
                const isWorkspace = item.href === "/dashboard/workspace";
                const isActive = isWorkspace
                  ? workspaceMatchPaths.some(
                      (p) => pathname === p || pathname.startsWith(p + "/")
                    )
                  : isDashboardRoot
                    ? pathname === "/dashboard"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                  )}
                  aria-label="Account menu"
                >
                  <UserAvatar name={user.name} email={user.email} photoUrl={user.photoUrl} />
                  <div className="grid min-w-0 flex-1 gap-0.5 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={user.email}>
                      {user.email}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} email={user.email} photoUrl={user.photoUrl} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/workspace">
                    <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
                    Workspace
                  </Link>
                </DropdownMenuItem>
                {user.profileSlug && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/broker/${encodeURIComponent(user.profileSlug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <HugeiconsIcon icon={ExternalLink} strokeWidth={2} className="size-4" />
                      View public profile
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setLogoutOpen(true)}>
                  <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          {user.profileSlug && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="View public profile">
                <Link
                  href={`/broker/${encodeURIComponent(user.profileSlug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HugeiconsIcon icon={ExternalLink} strokeWidth={2} />
                  <span>View public profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2 p-2">
              <ThemeSwitcher />
              <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">Theme</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </Sidebar>
  );
}
