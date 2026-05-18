"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Activity, CalendarClock, ShieldCheck, Users } from "lucide-react";

const TABS: { label: string; href: string; icon: typeof Users }[] = [
  { label: "Contacts", href: "/dashboard/contacts", icon: Users },
  { label: "Follow-ups", href: "/dashboard/contacts/follow-ups", icon: CalendarClock },
  { label: "Activity", href: "/dashboard/contacts/activity", icon: Activity },
  { label: "NDAs", href: "/dashboard/contacts/ndas", icon: ShieldCheck },
];

export function CrmTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="CRM sections"
      className="flex flex-wrap items-center gap-1 border-b"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === "/dashboard/contacts"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm transition-colors",
              "text-muted-foreground hover:text-foreground",
              isActive && "font-medium text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
