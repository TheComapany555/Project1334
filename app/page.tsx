import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { searchListings, getListingHighlights } from "@/lib/actions/listings";
import type { Listing } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
  ShieldCheck,
  Users,
  ChevronRight,
  Star,
  Search,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(listing: Listing): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    const n = Number(listing.asking_price);
    if (n >= 1_000_000)
      return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return "—";
}

// ─── Static data ──────────────────────────────────────────────────────────────
const STATS = [
  { value: "1,200+", label: "Active listings" },
  { value: "450+", label: "Verified brokers" },
  { value: "$2.4B+", label: "In transactions" },
  { value: "98%", label: "Satisfaction rate" },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified brokers",
    description:
      "Every broker is vetted and licensed. Buy and sell with complete confidence.",
  },
  {
    icon: TrendingUp,
    title: "Market insights",
    description:
      "Access real-time pricing data and market trends across all industries.",
  },
  {
    icon: Users,
    title: "Direct connections",
    description: "Connect directly with brokers. No middlemen, no hidden fees.",
  },
];


// ─── Page (Server Component) ───────────────────────────────────────────────────
export default async function HomePage() {
  const [session, searchResult, highlights] = await Promise.all([
    getSession(),
    searchListings({ sort: "newest", page: 1, page_size: 8 }),
    getListingHighlights(),
  ]);
  const recentListings = searchResult.listings;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-top">
          <div className="container flex h-14 sm:h-16 items-center justify-between gap-2 px-4 sm:px-6 max-w-7xl mx-auto">

            {/* Logo */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 transition-opacity duration-200 hover:opacity-75"
              aria-label="Salebiz home"
            >
              <Image
                src="/Salebiz.png"
                alt="Salebiz"
                width={120}
                height={36}
                className="h-7 w-auto object-contain sm:h-9"
                priority
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              
              <Button asChild variant="ghost" size="sm" className="nav-link">
                <Link href="/search">Browse listings</Link>
              </Button>
              {session?.user?.role === "admin" && (
                <Button asChild size="sm" variant="outline" className="btn-spring">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              {session?.user ? (
                <Button
                  asChild
                  size="sm"
                  className="btn-spring bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-sm shadow-[#1a5c38]/20"
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="sm" variant="ghost" className="btn-spring">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="btn-spring bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-sm shadow-[#1a5c38]/20"
                  >
                    <Link href="/auth/register">List your business</Link>
                  </Button>
                  <ThemeSwitcher />
                </>
              )}
            </nav>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center gap-1">
              <ThemeSwitcher />
              {session?.user ? (
                <Button
                  asChild
                  size="sm"
                  className="btn-spring bg-[#1a5c38] hover:bg-[#144a2d] text-white h-9 px-3 text-xs"
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  className="btn-spring bg-[#1a5c38] hover:bg-[#144a2d] text-white h-9 px-3 text-xs"
                >
                  <Link href="/auth/register">List now</Link>
                </Button>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-border/50">
                      <Image
                        src="/Salebiz.png"
                        alt="Salebiz"
                        width={110}
                        height={33}
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                    <nav className="flex flex-col gap-1 p-4 flex-1">
                      <Link
                        href="/search"
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        Browse listings
                      </Link>
                      {session?.user ? (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Dashboard
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/auth/login"
                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            Sign in
                          </Link>
                          <Link
                            href="/auth/register"
                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#1a5c38] dark:text-[#4ade80] hover:bg-[#1a5c38]/8 transition-colors"
                          >
                            List your business
                            <ArrowRight className="h-4 w-4 ml-auto" />
                          </Link>
                        </>
                      )}
                      {session?.user?.role === "admin" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Admin panel
                        </Link>
                      )}
                    </nav>
                    <div className="p-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Australia&apos;s trusted business marketplace
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-1">

          {/* ── Hero ────────────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden">
            <div
              className="absolute inset-0 -z-10 opacity-[0.04] dark:opacity-[0.08]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                backgroundSize: "28px 28px",
              }}
              aria-hidden
            />
            <div className="glow-a absolute -top-48 -right-48 -z-10 h-[400px] w-[400px] sm:h-[640px] sm:w-[640px] rounded-full bg-[#1a5c38]/8 blur-3xl dark:bg-[#1a5c38]/15" aria-hidden />
            <div className="glow-b absolute -bottom-24 -left-24 -z-10 h-[280px] w-[280px] sm:h-[440px] sm:w-[440px] rounded-full bg-[#1a5c38]/5 blur-3xl" aria-hidden />

            <div className="container px-4 sm:px-6 max-w-7xl mx-auto pt-10 pb-10 sm:pt-24 sm:pb-20 md:pt-32 md:pb-28">
              <div className="mx-auto max-w-4xl text-center">

                {/* Live badge */}
                <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-[#1a5c38]/20 bg-[#1a5c38]/8 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-[#1a5c38] dark:border-[#4ade80]/20 dark:bg-[#4ade80]/8 dark:text-[#4ade80] mb-5 sm:mb-7">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="ping-dot absolute inline-flex h-full w-full rounded-full bg-[#1a5c38] dark:bg-[#4ade80]" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1a5c38] dark:bg-[#4ade80]" />
                  </span>
                  Australia&apos;s leading business marketplace
                </div>

                <h1 className="hero-h1 text-[2rem] leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem] text-foreground">
                  Find your next{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-[#1a5c38] dark:text-[#4ade80]">business</span>
                    <span
                      className="absolute inset-x-0 bottom-0.5 sm:bottom-1 -z-0 h-2 sm:h-3 rounded-sm bg-[#1a5c38]/12 dark:bg-[#4ade80]/15"
                      aria-hidden
                    />
                  </span>
                  {" "}opportunity
                </h1>

                <p className="hero-sub mt-4 sm:mt-6 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
                  Browse thousands of established businesses for sale across Australia.
                  Connect directly with verified brokers and make your move with confidence.
                </p>

                {/* Hero search */}
                <form
                  action="/search"
                  method="get"
                  className="hero-cta mt-6 sm:mt-8 mx-auto max-w-2xl px-0"
                >
                  <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-sm shadow-lg shadow-black/5">
                    <div className="flex-1 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl bg-muted/40">
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      <Input
                        type="search"
                        name="q"
                        placeholder="Search businesses, industries…"
                        className="flex-1 min-w-0 h-auto border-0 bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto bg-[#1a5c38] hover:bg-[#144a2d] text-white rounded-full h-11 px-6 font-semibold text-sm shadow-md shrink-0 mobile-tap"
                    >
                      Search listings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>

                {/* CTA buttons */}
                <div className="hero-cta mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 px-0">
                  <Button
                    asChild
                    size="lg"
                    className="btn-spring w-full sm:w-auto bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-lg shadow-[#1a5c38]/25 px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base mobile-tap"
                  >
                    <Link href="/search">
                      Browse listings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="btn-spring w-full sm:w-auto h-11 sm:h-12 text-sm sm:text-base px-6 sm:px-8 mobile-tap"
                  >
                    <Link href="/auth/register">List a business</Link>
                  </Button>
                </div>

                <p className="hero-trust mt-4 sm:mt-5 text-xs text-muted-foreground flex items-center justify-center gap-1.5 px-4 sm:px-0 text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1a5c38] dark:text-[#4ade80] shrink-0" />
                  Trusted by brokers and buyers across all Australian states &amp; territories
                </p>
              </div>
            </div>
          </section>

          {/* ── Recent listings ─────────────────────────────────────────────── */}
          <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-16 md:py-20">
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-[#1a5c38] dark:text-[#4ade80] mb-1 sm:mb-1.5">
                    Latest opportunities
                  </p>
                  <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
                    Recently listed
                  </h2>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="btn-spring shrink-0 text-[#1a5c38] dark:text-[#4ade80] hover:text-[#144a2d] dark:hover:text-[#22c55e] text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Link href="/search" className="flex items-center gap-0.5">
                    View all <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground self-center mr-1">Filter by tag:</span>
                  {highlights.map((h) => (
                    <Button key={h.id} variant="outline" size="sm" className="h-8 text-xs rounded-full" asChild>
                      <Link href={`/search?highlight=${encodeURIComponent(h.id)}`}>
                        {h.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {recentListings.length > 0 ? (
              <>
                {/* 
                  Mobile: horizontal scroll row (show 1.5 cards to hint scroll)
                  Tablet+: 2 cols
                  Desktop: 4 cols
                */}
                <div className="block sm:hidden -mx-4">
                  <ul className="flex gap-3.5 px-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {recentListings.map((listing) => {
                      const thumb = listing.listing_images?.[0]?.url;
                      const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
                      return (
                        <li key={listing.id} className="listing-card group shrink-0 w-[72vw] max-w-[280px] snap-start">
                          <Link
                            href={`/listing/${listing.slug}`}
                            className="hover-spring flex flex-col h-full rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38] focus-visible:ring-offset-2"
                          >
                            <div className="card-img relative aspect-[16/10] w-full overflow-hidden bg-muted shrink-0">
                              {thumb ? (
                                <Image src={thumb} alt="" fill className="object-cover" sizes="72vw" />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Building2 className="h-8 w-8 text-muted-foreground/25" />
                                </div>
                              )}
                              {listing.category && (
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-0 text-[10px] font-medium shadow-sm px-1.5 py-0.5">
                                    {listing.category.name}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1 p-3">
                              <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
                                {listing.title}
                              </p>
                              {location && (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {location}
                                </p>
                              )}
                              {listing.listing_highlights && listing.listing_highlights.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {listing.listing_highlights.slice(0, 3).map((h) => (
                                    <span
                                      key={h.id}
                                      className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                    >
                                      {h.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-border/40 mt-2.5">
                                <p className="text-sm font-bold text-foreground">{formatPrice(listing)}</p>
                                <span className="text-[10px] text-[#1a5c38] dark:text-[#4ade80] flex items-center gap-0.5 font-medium">
                                  View <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Tablet / Desktop grid */}
                <ul className="hidden sm:grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {recentListings.map((listing) => {
                    const thumb = listing.listing_images?.[0]?.url;
                    const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
                    return (
                      <li key={listing.id} className="listing-card group">
                        <Link
                          href={`/listing/${listing.slug}`}
                          className="hover-spring flex flex-col h-full rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38] focus-visible:ring-offset-2"
                        >
                          <div className="card-img relative aspect-[16/10] w-full overflow-hidden bg-muted shrink-0">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 50vw, 25vw"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Building2 className="h-10 w-10 text-muted-foreground/25" />
                              </div>
                            )}
                            {listing.category && (
                              <div className="absolute top-2.5 left-2.5">
                                <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-0 text-xs font-medium shadow-sm">
                                  {listing.category.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 p-4">
                            <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground transition-colors duration-200 group-hover:text-[#1a5c38] dark:group-hover:text-[#4ade80]">
                              {listing.title}
                            </p>
                            {location && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {location}
                              </p>
                            )}
                            {listing.listing_highlights && listing.listing_highlights.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {listing.listing_highlights.slice(0, 4).map((h) => (
                                  <span
                                    key={h.id}
                                    className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                  >
                                    {h.label}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40 mt-3">
                              <p className="text-base font-bold text-foreground">{formatPrice(listing)}</p>
                              <span className="view-arrow text-xs text-[#1a5c38] dark:text-[#4ade80] flex items-center gap-0.5 font-medium">
                                View <ArrowRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-8 sm:mt-10 text-center">
                  <Button asChild variant="outline" size="lg" className="btn-spring px-8 sm:px-10 w-full sm:w-auto mobile-tap">
                    <Link href="/search">
                      See all listings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 sm:py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-foreground">No listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Be the first to list a business for sale.
                </p>
                {!session?.user && (
                  <Button
                    asChild
                    className="mt-5 btn-spring bg-[#1a5c38] hover:bg-[#144a2d] text-white mobile-tap"
                  >
                    <Link href="/auth/register">List your business</Link>
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* ── Why Salebiz ─────────────────────────────────────────────────── */}
          <section className="border-t border-border/50 bg-muted/20">
            <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-16 md:py-20">
              <div className="text-center mb-8 sm:mb-10">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-[#1a5c38] dark:text-[#4ade80] mb-2">
                  Why choose us
                </p>
                <h2 className="text-xl font-bold tracking-tight sm:text-3xl">
                  The smarter way to buy &amp; sell
                </h2>
              </div>

              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="feature-card hover-spring group rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm cursor-default flex sm:flex-col items-start sm:items-start gap-4 sm:gap-0"
                  >
                    <div className="feature-icon h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#1a5c38]/10 dark:bg-[#1a5c38]/20 flex items-center justify-center shrink-0 sm:mb-4">
                      <f.icon className="h-5 w-5 text-[#1a5c38] dark:text-[#4ade80]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1 sm:mb-1.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Broker CTA ──────────────────────────────────────────────────── */}
          {!session?.user && (
            <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-16 md:py-20">
              <div className="cta-card relative overflow-hidden rounded-2xl bg-[#1a5c38] px-5 py-10 sm:px-14 sm:py-12 text-center shadow-2xl shadow-[#1a5c38]/25">
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: "22px 22px",
                  }}
                  aria-hidden
                />
                <div className="glow-a absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/6 blur-3xl" aria-hidden />
                <div className="glow-b absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/6 blur-3xl" aria-hidden />

                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 font-medium mb-4 sm:mb-5">
                    <Star className="h-3 w-3 fill-white/60 text-white/60" />
                    For licensed brokers
                  </div>
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                    Ready to list your business?
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-white/70 max-w-lg mx-auto leading-relaxed px-2 sm:px-0">
                    Create your broker account and reach thousands of qualified buyers across
                    Australia. Free to get started.
                  </p>
                  <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="btn-spring w-full sm:w-auto bg-white text-[#1a5c38] hover:bg-white/90 shadow-lg font-semibold h-11 sm:h-12 px-6 sm:px-8 mobile-tap"
                    >
                      <Link href="/auth/register">
                        Create broker account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="ghost"
                      className="btn-spring w-full sm:w-auto text-white h-11 sm:h-12 px-6 sm:px-8 border border-white/20 hover:bg-white/10 mobile-tap"
                    >
                      <Link href="/auth/login">Sign in to existing account</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/50 bg-muted/20 safe-bottom">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-8 sm:py-12">
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-7 sm:gap-12">

              {/* Brand — full width on mobile */}
              <div className="xs:col-span-2 sm:col-span-1 flex flex-col gap-3">
                <Link href="/" aria-label="Salebiz home" className="transition-opacity duration-200 hover:opacity-75 w-fit">
                  <Image
                    src="/Salebiz.png"
                    alt="Salebiz"
                    width={110}
                    height={33}
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
                  Australia&apos;s trusted marketplace for buying and selling businesses.
                </p>
              </div>

              {/* Explore */}
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-1">
                  Explore
                </p>
                <Link href="/search" className="footer-link text-sm text-muted-foreground hover:text-foreground w-fit py-0.5">
                  Browse listings
                </Link>
                <Link href="/auth/register" className="footer-link text-sm text-muted-foreground hover:text-foreground w-fit py-0.5">
                  List a business
                </Link>
                <Link href="/auth/login" className="footer-link text-sm text-muted-foreground hover:text-foreground w-fit py-0.5">
                  Sign in
                </Link>
              </div>

              {/* Get started */}
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-1">
                  Get started
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ready to buy or sell? Create a free broker account today.
                </p>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a5c38] dark:text-[#4ade80] hover:underline underline-offset-4 w-fit mt-1 transition-all duration-200"
                >
                  Create account <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <Separator className="mt-8 sm:mt-10 mb-5 opacity-50" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p
                className="text-xs text-muted-foreground text-center sm:text-left"
                suppressHydrationWarning
              >
                © {new Date().getFullYear()} Salebiz.com.au. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
    </div>
  );
}