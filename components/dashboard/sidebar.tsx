"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const brokerNav = [
  { label: "Overview", href: "/dashboard" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Listings", href: "/dashboard/listings" },
  { label: "Enquiries", href: "/dashboard/enquiries" },
] as const;

export function BrokerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card">
      <div className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/Salebiz.png" alt="Salebiz" width={100} height={30} className="h-7 w-auto object-contain" />
          <span className="text-xs font-medium text-muted-foreground">Broker</span>
        </Link>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {brokerNav.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-muted"
                  : ""
              )}
            >
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    </aside>
  );
}
