import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { searchListings, getCategories } from "@/lib/actions/listings";
import type { Listing } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchForm } from "@/app/search/search-form";
import { SearchResults } from "@/app/search/search-results";

export const metadata: Metadata = {
  title: "Browse listings | Salebiz",
  description: "Search and filter businesses for sale across Australia",
};

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

function parseNum(v: string | string[] | undefined): number | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return s !== "" && !Number.isNaN(n) ? n : undefined;
}

function parseStr(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && s.trim() !== "" ? s.trim() : undefined;
}

export default async function SearchPage({ searchParams }: Props) {
  const [params, session] = await Promise.all([searchParams, getSession()]);
  const keyword = parseStr(params.q);
  const category = parseStr(params.category);
  const state = parseStr(params.state);
  const suburb = parseStr(params.suburb);
  const price_min = parseNum(params.price_min);
  const price_max = parseNum(params.price_max);
  const revenue_min = parseNum(params.revenue_min);
  const revenue_max = parseNum(params.revenue_max);
  const profit_min = parseNum(params.profit_min);
  const profit_max = parseNum(params.profit_max);
  const sort = (parseStr(params.sort) as "newest" | "price_asc" | "price_desc") ?? "newest";
  const page = Math.max(1, parseNum(params.page) ?? 1);

  const [result, categories] = await Promise.all([
    searchListings({
      keyword: keyword ?? null,
      category: category ?? null,
      state: state ?? null,
      suburb: suburb ?? null,
      price_min: price_min ?? null,
      price_max: price_max ?? null,
      revenue_min: revenue_min ?? null,
      revenue_max: revenue_max ?? null,
      profit_min: profit_min ?? null,
      profit_max: profit_max ?? null,
      sort,
      page,
      page_size: PAGE_SIZE,
    }),
    getCategories(),
  ]);

  const formValues = {
    q: keyword ?? "",
    category: category ?? "",
    state: state ?? "",
    suburb: suburb ?? "",
    price_min: price_min != null ? String(price_min) : "",
    price_max: price_max != null ? String(price_max) : "",
    revenue_min: revenue_min != null ? String(revenue_min) : "",
    revenue_max: revenue_max != null ? String(revenue_max) : "",
    profit_min: profit_min != null ? String(profit_min) : "",
    profit_max: profit_max != null ? String(profit_max) : "",
    sort,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center shrink-0 font-semibold text-foreground" aria-label="Salebiz home">
            <Image src="/Salebiz.png" alt="" width={100} height={30} className="h-7 w-auto object-contain sm:h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {session?.user ? (
              <Button size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container flex-1 px-4 py-6 sm:py-8 max-w-6xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse listings</h1>
            <p className="text-muted-foreground mt-1">Search and filter businesses for sale across Australia</p>
          </div>

          <SearchForm categories={categories} defaultValues={formValues} sortOptions={SORT_OPTIONS} />

          <SearchResults
            listings={result.listings}
            total={result.total}
            page={result.page}
            pageSize={result.page_size}
            totalPages={result.total_pages}
            currentParams={formValues}
          />
        </div>
      </main>
    </div>
  );
}
