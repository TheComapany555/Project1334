"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  children?: React.ReactNode;
  className?: string;
};

/** Wrapper for a row of filters. Use with FilterBarSearch, FilterBarSelect, etc. */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border pb-4",
        className
      )}
    >
      {children}
    </div>
  );
}

type FilterBarSearchProps = {
  placeholder?: string;
  paramName?: string;
  className?: string;
};

export function FilterBarSearch({
  placeholder = "Search…",
  paramName = "q",
  className,
}: FilterBarSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem(paramName) as HTMLInputElement)?.value?.trim();
    const next = new URLSearchParams(searchParams.toString());
    if (q) next.set(paramName, q);
    else next.delete(paramName);
    next.delete("page");
    router.push(`?${next.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          name={paramName}
          placeholder={placeholder}
          defaultValue={value}
          className="pl-8 w-48 sm:w-56"
          aria-label={placeholder}
        />
      </div>
      <Button type="submit" size="sm">
        Search
      </Button>
    </form>
  );
}

type FilterBarSelectProps = {
  paramName: string;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
};

export function FilterBarSelect({
  paramName,
  placeholder,
  options,
  className,
}: FilterBarSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? "";

  function onValueChange(val: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (val) next.set(paramName, val);
    else next.delete(paramName);
    next.delete("page");
    router.push(`?${next.toString()}`);
  }

  return (
    <Select value={value || "all"} onValueChange={(v) => onValueChange(v === "all" ? "" : v)}>
      <SelectTrigger className={cn("w-[180px]", className)} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterBarClear({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => router.push(pathname)}
    >
      Clear filters
    </Button>
  );
}
