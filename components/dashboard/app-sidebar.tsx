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
import { cn } from "@/lib/utils";

const brokerNav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
  { label: "Listings", href: "/dashboard/listings", icon: FileIcon },
  { label: "Enquiries", href: "/dashboard/enquiries", icon: MailIcon },
] as const;

type SidebarUser = {
  name: string | null;
  email: string;
  role: "broker" | "admin";
  profileSlug?: string;
  photoUrl?: string | null;
};

function UserAvatar({
  name,
  email,
  photoUrl,
  className,
}: {
  name: string | null;
  email: string;
  photoUrl?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <span className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}>
        <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
      </span>
    );
  }
  const initial = (name?.trim() || email).charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium",
        className
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

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
                  src="/Salebizsvg.svg"
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
              {brokerNav.map((item) => {
                const isDashboardRoot = item.href === "/dashboard";
                const isActive = isDashboardRoot
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
                  <Link href="/dashboard/profile">
                    <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
                    Edit profile
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
