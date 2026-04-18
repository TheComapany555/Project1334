import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { searchListings, getListingHighlights } from "@/lib/actions/listings";
import type { Listing } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PublicHeader } from "@/components/public-header";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";
import {
  MotionDiv,
  MotionH1,
  MotionP,
  MotionUl,
  MotionLi,
  fadeUp,
  staggerContainer,
} from "@/components/motion";
import {
  FeaturedBadge,
  isFeaturedBadgeForBrowseSurface,
} from "@/components/listings/featured-badge";
import { AdSlot } from "@/components/ads/ad-slot";
import { NestedNavLink } from "@/components/public/nested-nav-link";
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
  User,
} from "lucide-react";

// Revalidate homepage every 5 minutes for fresh listings
export const revalidate = 300;

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

// ─── Listing Card (shared between mobile scroll + desktop grid) ───────────────
function ListingCard({ listing, sizes }: { listing: Listing; sizes: string }) {
  const thumb = listing.listing_images?.[0]?.url;
  const location =
    listing.location_text ||
    [listing.suburb, listing.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted shrink-0">
        {thumb ? (
          <Image
            src={thumb}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes={sizes}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-9 w-9 text-muted-foreground/25" />
          </div>
        )}
        {isFeaturedBadgeForBrowseSurface(listing, "homepage") && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <FeaturedBadge size="sm" />
          </div>
        )}
        {listing.category && (
          <div className="absolute top-2.5 left-2.5">
            <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-0 text-[10px] font-medium shadow-sm px-1.5 py-0.5">
              {listing.category.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4">
        {(listing.broker || listing.agency) && (
          <div className="flex items-center gap-2 mb-2">
            <Avatar size="sm">
              {listing.broker?.photo_url && (
                <AvatarImage
                  src={listing.broker.photo_url}
                  alt={listing.broker.name ?? "Broker"}
                />
              )}
              <AvatarFallback>
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground truncate">
                {listing.broker?.name ?? "Broker"}
              </span>
              {listing.agency && (
                <span className="text-[10px] text-muted-foreground/70 truncate">
                  {listing.agency.slug ? (
                    <NestedNavLink
                      href={`/agency/${listing.agency.slug}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {listing.agency.name}
                    </NestedNavLink>
                  ) : (
                    listing.agency.name
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground transition-colors duration-200 group-hover:text-primary">
          {listing.title}
        </p>

        {listing.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
            {listing.summary}
          </p>
        )}

        {location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </p>
        )}

        {listing.listing_highlights &&
          listing.listing_highlights.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {listing.listing_highlights.slice(0, 3).map((h) => (
                <span
                  key={h.id}
                  className="inline-flex bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {h.label}
                </span>
              ))}
            </div>
          )}

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-border">
          <p className="text-sm font-bold text-foreground">
            {formatPrice(listing)}
          </p>
          <span className="text-[11px] text-primary flex items-center gap-0.5 font-medium">
            View{" "}
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

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
      <PublicHeader session={session} variant="full" />

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Grid bg — light mode uses dark lines, dark mode uses light lines */}
          <div
            className="absolute inset-0 -z-10 [background-image:linear-gradient(rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:[background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:60px_60px]"
            aria-hidden
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/50 to-background"
            aria-hidden
          />
          {/* Glow blobs */}
          <div
            className="absolute -top-48 -right-48 -z-10 h-[400px] w-[400px] sm:h-[640px] sm:w-[640px] rounded-full bg-primary/8 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div
            className="absolute -bottom-24 -left-24 -z-10 h-[280px] w-[280px] sm:h-[440px] sm:w-[440px] rounded-full bg-primary/5 blur-3xl pointer-events-none"
            aria-hidden
          />

          <div className="container px-4 sm:px-6 max-w-7xl mx-auto pt-14 pb-14 sm:pt-28 sm:pb-24 md:pt-36 md:pb-32">
            <div className="mx-auto max-w-4xl text-center">
              {/* Live badge */}
              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="inline-flex rounded-sm items-center gap-2 border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-primary mb-6 sm:mb-8"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Australia&apos;s leading business marketplace
              </MotionDiv>

              {/* Heading */}
              <MotionH1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
                className="text-[2.25rem] leading-[1.08] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-[4.5rem] text-foreground"
              >
                Find your next{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">business</span>
                  <span
                    className="absolute inset-x-0 bottom-0.5 sm:bottom-1 -z-0 h-2 sm:h-3 bg-primary/12"
                    aria-hidden
                  />
                </span>{" "}
                opportunity
              </MotionH1>

              <MotionP
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-5 sm:mt-7 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                Browse thousands of established businesses for sale across
                Australia. Connect directly with verified brokers and make your
                move with confidence.
              </MotionP>

              {/* Hero search */}
              <MotionDiv
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <form
                  action="/search"
                  method="get"
                  className="mt-7 sm:mt-9 mx-auto max-w-2xl"
                >
                  <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-lg shadow-black/5">
                    <div className="flex flex-1 items-center gap-3 px-3 sm:px-4 py-2.5 bg-muted/40">
                      <Search
                        className="h-4 w-4 text-muted-foreground shrink-0"
                        aria-hidden
                      />
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
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 font-semibold text-sm shadow-md shrink-0 transition-transform duration-150 active:scale-[0.98]"
                    >
                      Search listings
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </MotionDiv>

              <MotionP
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mt-5 text-xs text-muted-foreground flex items-center justify-center gap-1.5 text-center"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                Trusted by brokers and buyers across all Australian states &amp;
                territories
              </MotionP>
            </div>
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/30">
          <MotionDiv
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={staggerContainer}
            className="container px-4 sm:px-6 max-w-7xl mx-auto py-7 sm:py-10"
          >
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4 sm:gap-8">
              {STATS.map((stat) => (
                <MotionDiv
                  key={stat.label}
                  variants={fadeUp}
                  transition={{ duration: 0.4 }}
                  className="text-center"
                >
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>
        </section>

        {/* ── Recent listings ─────────────────────────────────────────────── */}
        <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-12 sm:py-20 md:py-24">
          {/* Section header */}
          <MotionDiv
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4 mb-7 sm:mb-10"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary mb-1 sm:mb-1.5">
                  Latest opportunities
                </p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Recently listed
                </h2>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="shrink-0 text-primary hover:text-primary/80 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Link href="/search" className="flex items-center gap-0.5">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Highlight filter tags */}
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">
                  Filter by tag:
                </span>
                {highlights.map((h) => (
                  <Button
                    key={h.id}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    asChild
                  >
                    <Link
                      href={`/search?highlight=${encodeURIComponent(h.id)}`}
                    >
                      {h.label}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </MotionDiv>

          {recentListings.length > 0 ? (
            <>
              {/* Mobile: horizontal swipe. Tablet+: grid */}
              <MotionUl
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={staggerContainer}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:gap-5 sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4"
              >
                {recentListings.map((listing) => (
                  <MotionLi
                    key={listing.id}
                    variants={fadeUp}
                    transition={{ duration: 0.4 }}
                    className="min-w-[75vw] snap-start sm:min-w-0 sm:h-full"
                  >
                    <ListingCard
                      listing={listing}
                      sizes="(max-width: 640px) 75vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </MotionLi>
                ))}
              </MotionUl>

              <MotionDiv
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-10 sm:mt-12 text-center"
              >
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-8 sm:px-10 transition-transform duration-150 active:scale-[0.98]"
                >
                  <Link href="/search">
                    See all listings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </MotionDiv>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-14 sm:py-18 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-foreground">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to list a business for sale.
              </p>
              {!session?.user && (
                <Button
                  asChild
                  className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Link href="/auth/register">Get started</Link>
                </Button>
              )}
            </div>
          )}
        </section>

        {/* ── Homepage Ad Slot ──────────────────────────────────────────── */}
        <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-6 sm:py-8">
          <AdSlot placement="homepage" layout="banner" limit={1} />
        </section>

        {/* ── Why Salebiz ─────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-muted/20">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-12 sm:py-20 md:py-24">
            <MotionDiv
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-center mb-10 sm:mb-12"
            >
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                Why choose us
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                The smarter way to buy &amp; sell
              </h2>
            </MotionDiv>

            <MotionDiv
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3"
            >
              {FEATURES.map((f) => (
                <MotionDiv
                  key={f.title}
                  variants={fadeUp}
                  transition={{ duration: 0.4 }}
                  className="group rounded-xl border border-border bg-card shadow-sm p-5 sm:p-7 transition-all duration-200 hover:border-primary/30 hover:shadow-md cursor-default flex sm:flex-col items-start gap-4 sm:gap-0"
                >
                  <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 sm:mb-5 transition-colors duration-200 group-hover:bg-primary/15">
                    <f.icon className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-[15px] mb-1.5 sm:mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-12 sm:py-20 md:py-24">
            <MotionDiv
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-center mb-10 sm:mb-14"
            >
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                Simple process
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                How it works
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                Whether you&apos;re buying or selling, getting started takes
                just a few steps.
              </p>
            </MotionDiv>

            <MotionDiv
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto"
            >
              {/* For buyers */}
              <MotionDiv
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                className="rounded-xl border border-border bg-card p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">For buyers</h3>
                </div>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-medium">Browse listings</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Search by industry, location, or price range to find the
                        right opportunity.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-medium">Contact the broker</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Send an enquiry directly from the listing page to
                        connect with the broker.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-medium">Make your move</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Work with the broker to negotiate terms and finalise the
                        purchase.
                      </p>
                    </div>
                  </li>
                </ol>
              </MotionDiv>

              {/* For agencies / brokers */}
              <MotionDiv
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                className="rounded-xl border border-border bg-card p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    For agencies &amp; brokers
                  </h3>
                </div>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Register your agency
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sign up with your agency details. An admin will review
                        and approve your account.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Subscribe &amp; invite your team
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose a subscription plan and invite brokers to join
                        your agency.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        List businesses for sale
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Create listings, choose a visibility level, and start
                        receiving buyer enquiries.
                      </p>
                    </div>
                  </li>
                </ol>
              </MotionDiv>
            </MotionDiv>
          </div>
        </section>

        {/* ── Agency CTA ──────────────────────────────────────────────────── */}
        {!session?.user && (
          <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-12 sm:py-20 md:py-24">
            <MotionDiv
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl bg-primary px-5 py-12 sm:px-14 sm:py-14 text-center"
            >
              {/* Dot pattern */}
              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: "22px 22px",
                }}
                aria-hidden
              />
              {/* Glow accents */}
              <div
                className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/6 blur-3xl pointer-events-none"
                aria-hidden
              />
              <div
                className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/6 blur-3xl pointer-events-none"
                aria-hidden
              />

              <div className="relative">
                <div className="inline-flex rounded-full items-center gap-1.5 bg-white/10 px-3 py-1 text-xs text-white/80 font-medium mb-5 sm:mb-6">
                  <Star className="h-3 w-3 fill-white/60 text-white/60" />
                  For agencies &amp; brokers
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight">
                  Ready to list businesses for sale?
                </h2>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/70 max-w-lg mx-auto leading-relaxed">
                  Register your agency, invite your team, and reach thousands of
                  qualified buyers across Australia.
                </p>
                <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-lg font-semibold h-11 sm:h-12 px-6 sm:px-8 transition-transform duration-150 active:scale-[0.98]"
                  >
                    <Link href="/auth/register">
                      Register your agency
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="w-full sm:w-auto text-white h-11 sm:h-12 px-6 sm:px-8 border border-white/20 hover:bg-white/10"
                  >
                    <Link href="/auth/login">Sign in to existing account</Link>
                  </Button>
                </div>
              </div>
            </MotionDiv>
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                aria-label="Salebiz home"
                className="transition-opacity duration-200 hover:opacity-75 w-fit"
              >
                <Image
                  src={SALEBIZ_LOGO_URL}
                  alt="Salebiz"
                  width={110}
                  height={33}
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
                Australia&apos;s trusted marketplace for buying and selling
                businesses.
              </p>
            </div>

            {/* Explore */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-1">
                Explore
              </p>
              <Link
                href="/search"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit py-0.5"
              >
                Browse listings
              </Link>
              <Link
                href="/auth/register"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit py-0.5"
              >
                Register your agency
              </Link>
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit py-0.5"
              >
                Sign in
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit py-0.5"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit py-0.5"
              >
                Terms of Service
              </Link>
            </div>

            {/* Get started */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-1">
                Get started
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ready to buy or sell? Register your agency and get started
                today.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 w-fit mt-1 transition-all duration-200"
              >
                Create account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <Separator className="mt-10 sm:mt-12 mb-6 opacity-50" />

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
