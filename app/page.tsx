import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { searchListings } from "@/lib/actions/listings";
import type { Listing } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

function formatPrice(listing: Listing): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    const n = Number(listing.asking_price);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return "—";
}

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
    description: "Every broker is vetted and licensed. Buy and sell with complete confidence.",
  },
  {
    icon: TrendingUp,
    title: "Market insights",
    description: "Access real-time pricing data and market trends across all industries.",
  },
  {
    icon: Users,
    title: "Direct connections",
    description: "Connect directly with brokers. No middlemen, no hidden fees.",
  },
];

export default async function HomePage() {
  const [session, searchResult] = await Promise.all([
    getSession(),
    searchListings({ sort: "newest", page: 1, page_size: 8 }),
  ]);
  const recentListings = searchResult.listings;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-4 px-4 sm:px-6 max-w-7xl mx-auto">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Salebiz home">
            <Image
              src="/Salebiz.png"
              alt="Salebiz"
              width={120}
              height={36}
              className="h-8 w-auto object-contain sm:h-9"
              priority
            />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/search">Browse listings</Link>
            </Button>
            {session?.user?.role === "admin" && (
              <Button asChild size="sm" variant="outline">
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            {session?.user ? (
              <Button asChild size="sm" className="bg-[#1a5c38] hover:bg-[#144a2d] text-white">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-sm"
                >
                  <Link href="/auth/register">List your business</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Dot grid background */}
          <div
            className="absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
            aria-hidden
          />
          {/* Ambient glows */}
          <div className="absolute -top-40 -right-40 -z-10 h-[600px] w-[600px] rounded-full bg-[#1a5c38]/8 blur-3xl dark:bg-[#1a5c38]/15" aria-hidden />
          <div className="absolute -bottom-20 -left-20 -z-10 h-[400px] w-[400px] rounded-full bg-[#1a5c38]/5 blur-3xl" aria-hidden />

          <div className="container px-4 sm:px-6 max-w-7xl mx-auto pt-16 pb-14 sm:pt-24 sm:pb-20 md:pt-32 md:pb-28">
            <div className="mx-auto max-w-4xl text-center">
              {/* Live indicator pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1a5c38]/20 bg-[#1a5c38]/8 px-3.5 py-1.5 text-xs font-medium text-[#1a5c38] dark:border-[#4ade80]/20 dark:bg-[#4ade80]/8 dark:text-[#4ade80] mb-7">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1a5c38] opacity-60 dark:bg-[#4ade80]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1a5c38] dark:bg-[#4ade80]" />
                </span>
                Australia&apos;s leading business marketplace
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem] text-foreground leading-[1.1]">
                Find your next{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#1a5c38] dark:text-[#4ade80]">business</span>
                  <span
                    className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded bg-[#1a5c38]/12 dark:bg-[#4ade80]/15"
                    aria-hidden
                  />
                </span>
                <br className="hidden sm:block" />
                {" "}opportunity
              </h1>

              <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Browse thousands of established businesses for sale across Australia.
                Connect directly with verified brokers and make your move with confidence.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-lg shadow-[#1a5c38]/25 px-8 h-12 text-base"
                >
                  <Link href="/search">
                    Browse listings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 text-base px-8">
                  <Link href="/auth/register">List a business</Link>
                </Button>
              </div>

              <p className="mt-5 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1a5c38] dark:text-[#4ade80]" />
                Trusted by brokers and buyers across all Australian states &amp; territories
              </p>
            </div>
          </div>
        </section>

        {/* ── Recent listings ── */}
        <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-14 sm:py-16 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1a5c38] dark:text-[#4ade80] mb-1.5">
                Latest opportunities
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Recently listed businesses
              </h2>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="shrink-0 text-[#1a5c38] dark:text-[#4ade80] hover:text-[#144a2d] dark:hover:text-[#22c55e]"
            >
              <Link href="/search" className="flex items-center gap-0.5">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {recentListings.length > 0 ? (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {recentListings.map((listing) => {
                  const thumb = listing.listing_images?.[0]?.url;
                  const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
                  return (
                    <li key={listing.id} className="group">
                      <Link
                        href={`/listing/${listing.slug}`}
                        className="flex flex-col h-full rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38]"
                      >
                        {/* Image */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted shrink-0">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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

                        {/* Body */}
                        <div className="flex flex-col flex-1 p-4">
                          <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-[#1a5c38] dark:group-hover:text-[#4ade80] transition-colors">
                            {listing.title}
                          </p>
                          {location && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {location}
                            </p>
                          )}
                          <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40 mt-3">
                            <p className="text-base font-bold text-foreground">
                              {formatPrice(listing)}
                            </p>
                            <span className="text-xs text-[#1a5c38] dark:text-[#4ade80] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                              View <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-10 text-center">
                <Button asChild variant="outline" size="lg" className="px-10">
                  <Link href="/search">
                    See all listings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-foreground">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to list a business for sale.</p>
              {!session?.user && (
                <Button asChild className="mt-5 bg-[#1a5c38] hover:bg-[#144a2d] text-white">
                  <Link href="/auth/register">List your business</Link>
                </Button>
              )}
            </div>
          )}
        </section>

        {/* ── Why Salebiz ── */}
        <section className="border-t border-border/60 bg-muted/20">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-14 sm:py-16 md:py-20">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1a5c38] dark:text-[#4ade80] mb-2">
                Why choose us
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                The smarter way to buy &amp; sell
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-border/60 bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-10 w-10 rounded-lg bg-[#1a5c38]/10 dark:bg-[#1a5c38]/20 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-[#1a5c38] dark:text-[#4ade80]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Broker CTA ── */}
        {!session?.user && (
          <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-14 sm:py-16 md:py-20">
            <div className="relative overflow-hidden rounded-2xl bg-[#1a5c38] px-6 py-12 sm:px-14 text-center shadow-2xl shadow-[#1a5c38]/20">
              {/* Dot texture overlay */}
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }}
                aria-hidden
              />
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" aria-hidden />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" aria-hidden />

              <div className="relative">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 font-medium mb-5">
                  <Star className="h-3 w-3 fill-white/60 text-white/60" />
                  For licensed brokers
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Ready to list your business?
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/70 max-w-lg mx-auto leading-relaxed">
                  Create your broker account and reach thousands of qualified buyers across
                  Australia. Free to get started.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="w-full sm:w-auto bg-white text-[#1a5c38] hover:bg-white/90 shadow-lg font-semibold h-12 px-8"
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
                    className="w-full sm:w-auto text-white  h-12 px-8 border border-white/20"
                  >
                    <Link href="/auth/login">Sign in to existing account</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">

            {/* Brand col */}
            <div className="flex flex-col gap-3">
              <Link href="/" aria-label="Salebiz home">
                <Image
                  src="/Salebiz.png"
                  alt="Salebiz"
                  width={110}
                  height={33}
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                Australia&apos;s trusted marketplace for buying and selling businesses.
              </p>
            </div>

            {/* Links col */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-1">
                Explore
              </p>
              <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                Browse listings
              </Link>
              <Link href="/auth/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                List a business
              </Link>
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                Sign in
              </Link>
            </div>

            {/* Contact / CTA col */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-1">
                Get started
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ready to buy or sell? Create a free broker account today.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a5c38] dark:text-[#4ade80] hover:underline w-fit mt-1"
              >
                Create account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Salebiz.com.au. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}