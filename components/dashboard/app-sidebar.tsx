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
  ExternalLink,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";

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
      <span
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-sidebar-border",
          className
        )}
      >
        <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
      </span>
    );
  }
  const initial = (name?.trim() || email).charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1a5c38]/15 text-[#1a5c38] dark:bg-[#4ade80]/15 dark:text-[#4ade80] text-sm font-semibold ring-2 ring-[#1a5c38]/20 dark:ring-[#4ade80]/20",
        className
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const displayName = user.name?.trim() || user.email || "Account";

  return (
    <Sidebar collapsible="icon">
      {/* ── Header ── */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Salebiz">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <Image
                  src="/Salebiz.png"
                  alt="Salebiz"
                  width={100}
                  height={30}
                  className="h-7 w-auto object-contain"
                />
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5 font-medium group-data-[collapsible=icon]:hidden"
                >
                  Broker
                </Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 mb-1 group-data-[collapsible=icon]:hidden">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {brokerNav.map((item) => {
                const isDashboardRoot = item.href === "/dashboard";
                const isActive = isDashboardRoot
                  ? pathname === "/dashboard"
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "rounded-lg h-9 gap-3 transition-colors",
                        isActive
                          ? "bg-[#1a5c38]/10 text-[#1a5c38] dark:bg-[#4ade80]/10 dark:text-[#4ade80] font-medium"
                          : "hover:bg-sidebar-accent"
                      )}
                    >
                      <Link href={item.href} prefetch={false}>
                        <HugeiconsIcon
                          icon={item.icon}
                          strokeWidth={isActive ? 2.5 : 2}
                          className="size-4 shrink-0"
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1a5c38] dark:bg-[#4ade80] group-data-[collapsible=icon]:hidden" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Public profile shortcut */}
        {user.profileSlug && (
          <>
            <SidebarSeparator className="my-3" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 mb-1 group-data-[collapsible=icon]:hidden">
                Public
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="View public profile"
                      className="rounded-lg h-9 gap-3 hover:bg-sidebar-accent"
                    >
                      <Link
                        href={`/broker/${encodeURIComponent(user.profileSlug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <HugeiconsIcon
                          icon={ExternalLink}
                          strokeWidth={2}
                          className="size-4 shrink-0"
                        />
                        <span>View public profile</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border px-2 py-3 gap-1">
        {/* Theme toggle row */}
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5">
              <ThemeSwitcher />
              <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Theme
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User menu */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none",
                    "hover:bg-sidebar-accent transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                  )}
                  aria-label="Account menu"
                >
                  <UserAvatar
                    name={user.name}
                    email={user.email}
                    photoUrl={user.photoUrl}
                  />
                  <div className="grid min-w-0 flex-1 gap-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                      {displayName}
                    </p>
                    <p
                      className="truncate text-xs text-muted-foreground leading-tight mt-0.5"
                      title={user.email}
                    >
                      {user.email}
                    </p>
                  </div>
                  <ChevronUp className="ml-auto size-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-60"
              >
                {/* User info header */}
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user.name}
                      email={user.email}
                      photoUrl={user.photoUrl}
                      className="size-10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {user.email}
                      </p>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 mt-1.5 font-medium capitalize"
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="gap-2.5">
                    <HugeiconsIcon
                      icon={UserIcon}
                      strokeWidth={2}
                      className="size-4"
                    />
                    Edit profile
                  </Link>
                </DropdownMenuItem>

                {user.profileSlug && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/broker/${encodeURIComponent(user.profileSlug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2.5"
                    >
                      <HugeiconsIcon
                        icon={ExternalLink}
                        strokeWidth={2}
                        className="size-4"
                      />
                      View public profile
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2.5"
                  onSelect={() => signOut({ callbackUrl: "/" })}
                >
                  <HugeiconsIcon
                    icon={LogoutIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}