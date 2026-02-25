"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type Props = {
  title?: string;
  description?: string;
};

export function DashboardHeader({ title, description }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 sm:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      {title && (
        <div className="flex flex-1 flex-col gap-0.5">
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
    </header>
  );
}
