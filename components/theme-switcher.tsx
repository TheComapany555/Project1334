"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SunIcon, MoonIcon, ComputerIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Theme">
        <span className="h-4 w-4 rounded-full bg-muted" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle theme">
          {resolvedTheme === "dark" ? (
            <HugeiconsIcon icon={MoonIcon} strokeWidth={2} className="size-4" />
          ) : (
            <HugeiconsIcon icon={SunIcon} strokeWidth={2} className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
          <DropdownMenuRadioItem value="light">
            <HugeiconsIcon icon={SunIcon} strokeWidth={2} className="size-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <HugeiconsIcon icon={MoonIcon} strokeWidth={2} className="size-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} className="size-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
