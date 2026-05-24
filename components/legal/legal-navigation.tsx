"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

export type NavItem = { id: string; number: string; title: string };

type LegalNavigationProps = {
  items: NavItem[];
  related?: { href: string; label: string };
};

export function LegalNavigation({ items, related }: LegalNavigationProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );

    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const handleAnchorClick = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
        setActive(id);
      }
      setOpen(false);
    },
    [],
  );

  return (
    <>
      {/* Desktop sidebar TOC */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            On this page
          </p>
          <nav className="flex flex-col border-l border-border">
            {items.map((item) => {
              const isActive = active === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={handleAnchorClick(item.id)}
                  className={cn(
                    "-ml-px flex items-baseline gap-3 border-l-2 pl-4 py-2 text-sm transition-colors",
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span
                    className={cn(
                      "text-[11px] font-mono tabular-nums",
                      isActive
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {item.number}
                  </span>
                  <span className="leading-snug">{item.title}</span>
                </a>
              );
            })}
          </nav>
          {related && (
            <div className="mt-8 border-t border-border pt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Related
              </p>
              <Link
                href={related.href}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {related.label}
                <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile floating button + drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg lg:hidden cursor-pointer"
            aria-label="Open table of contents"
          >
            <List className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[85vw] max-w-sm flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-base font-semibold tracking-tight">
              On this page
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {items.map((item) => {
              const isActive = active === item.id;
              return (
                <SheetClose asChild key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={handleAnchorClick(item.id)}
                    className={cn(
                      "flex items-baseline gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground/60">
                      {item.number}
                    </span>
                    <span className="leading-snug">{item.title}</span>
                  </a>
                </SheetClose>
              );
            })}
            {related && (
              <>
                <div className="my-3 h-px bg-border" />
                <SheetClose asChild>
                  <Link
                    href={related.href}
                    className="flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    <span>{related.label}</span>
                    <span aria-hidden>→</span>
                  </Link>
                </SheetClose>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
