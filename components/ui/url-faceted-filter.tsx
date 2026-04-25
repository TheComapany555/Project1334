"use client";

import { Check, PlusCircle } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export type FacetOption = {
  value: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

type Props = {
  title: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: FacetOption[];
};

/**
 * Single-select faceted filter that delegates state to the parent
 * (typically `useTableUrlState`). Use this in server-paginated tables
 * instead of the row-model-bound `DataTableFacetedFilter`, which only
 * filters the current page slice.
 */
export function UrlFacetedFilter({ title, value, onChange, options }: Props) {
  const selected = options.find((o) => o.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircle className="mr-2 h-3.5 w-3.5" />
          {title}
          {selected && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {selected.label}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-1">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(isSelected ? null : option.value)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-[3px] border border-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible",
                  )}
                >
                  <Check className="h-3 w-3" />
                </div>
                {option.icon && (
                  <option.icon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="flex-1 text-left capitalize">{option.label}</span>
              </button>
            );
          })}
        </div>
        {value && (
          <>
            <Separator />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="w-full px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent"
            >
              Clear
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
