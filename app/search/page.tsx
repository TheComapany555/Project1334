import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { searchListings, getCategories, getListingHighlights } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SearchForm } from "@/app/search/search-form";
import { SearchResults } from "@/app/search/search-results";

export const metadata: Metadata = {
  title: "Browse listings | Salebiz",
  description: "Search and filter businesses for sale across Australia",
};

const PAGE_SIZE = 12;
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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

/** Count how many filter fields (beyond keyword + sort) are active */
function countActiveFilters(p: {
  category?: string;
  highlight?: string;
  state?: string;
  suburb?: string;
  price_min?: number;
  price_max?: number;
  revenue_min?: number;
  revenue_max?: number;
  profit_min?: number;
  profit_max?: number;
}) {
  return [
    p.category,
    p.highlight,
    p.state,
    p.suburb,
    p.price_min,
    p.price_max,
    p.revenue_min,
    p.revenue_max,
    p.profit_min,
    p.profit_max,
  ].filter((v) => v != null && v !== "").length;
}

export default async function SearchPage({ searchParams }: Props) {
  const [params, session] = await Promise.all([searchParams, getSession()]);

  const keyword = parseStr(params.q);
  const category = parseStr(params.category);
  const highlight = parseStr(params.highlight);
  const state = parseStr(params.state);
  const suburb = parseStr(params.suburb);
  const price_min = parseNum(params.price_min);
  const price_max = parseNum(params.price_max);
  const revenue_min = parseNum(params.revenue_min);
  const revenue_max = parseNum(params.revenue_max);
  const profit_min = parseNum(params.profit_min);
  const profit_max = parseNum(params.profit_max);
  const sort =
    (parseStr(params.sort) as "newest" | "price_asc" | "price_desc") ??
    "newest";
  const page = Math.max(1, parseNum(params.page) ?? 1);

  const [result, categories, highlights] = await Promise.all([
    searchListings({
      keyword: keyword ?? null,
      category: category ?? null,
      highlight_id: highlight ?? null,
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
    getListingHighlights(),
  ]);

  const formValues = {
    q: keyword ?? "",
    category: category ?? "",
    highlight: highlight ?? "",
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

  const activeFilters = countActiveFilters({
    category,
    highlight,
    state,
    suburb,
    price_min,
    price_max,
    revenue_min,
    revenue_max,
    profit_min,
    profit_max,
  });

  const isFiltered = !!(keyword || activeFilters > 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
          <Link
            href="/"
            className="flex items-center shrink-0"
            aria-label="Salebiz home"
          >
            <Image
              src="/Salebiz.png"
              alt="Salebiz"
              width={100}
              height={30}
              className="h-7 w-auto object-contain sm:h-8"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {session?.user ? (
              <Button size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/auth/register">Create account</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container flex-1 px-4 py-8 sm:py-10 max-w-6xl">
        <div className="space-y-8">

          {/* ── Page heading ── */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Browse listings
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search and filter businesses for sale across Australia.
                </p>
              </div>

              {/* Results summary — shown when a search is active */}
              {isFiltered && (
                <div className="flex items-center gap-2 flex-wrap">
                  {keyword && (
                    <Badge variant="secondary" className="gap-1">
                      "{keyword}"
                    </Badge>
                  )}
                  {activeFilters > 0 && (
                    <Badge variant="outline" className="gap-1">
                      {activeFilters} filter{activeFilters > 1 ? "s" : ""} active
                    </Badge>
                  )}
                  {highlight && highlights.find((h) => h.id === highlight) && (
                    <Badge variant="secondary" className="gap-1">
                      Tag: {highlights.find((h) => h.id === highlight)?.label}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {result.total === 0
                      ? "No results"
                      : `${result.total} result${result.total === 1 ? "" : "s"}`}
                  </span>
                </div>
              )}
            </div>

            <Separator />
          </div>

          {/* ── Search form ── */}
          <SearchForm
            categories={categories}
            highlights={highlights}
            defaultValues={formValues}
            sortOptions={SORT_OPTIONS}
          />

          {/* ── Results ── */}
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

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Salebiz. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}