"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SelectionToolbar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  /** Bulk action buttons. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <span className="text-sm font-medium">
        {count} selected
      </span>
      <div className="flex items-center gap-2">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={onClear}
      >
        <X className="size-4" aria-hidden />
        Clear
      </Button>
    </div>
  );
}
