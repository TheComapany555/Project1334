import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { searchListings } from "@/lib/actions/listings";
import type { Listing } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

function formatPrice(listing: Listing): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.asking_price));
  }
  return "—";
}

export default async function HomePage() {
  const [session, searchResult] = await Promise.all([
    getSession(),
    searchListings({ sort: "newest", page: 1, page_size: 8 }),
  ]);
  const recentListings = searchResult.listings;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-foreground" aria-label="Salebiz home">
            <Image src="/Salebiz.png" alt="Salebiz" width={120} height={36} className="h-8 w-auto object-contain sm:h-9" priority />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/search">Browse listings</Link>
            </Button>
            {session?.user?.role === "admin" && (
              <Button asChild size="sm">
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            {session?.user ? (
              <Button asChild size="sm" variant="default">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" variant="default">
                  <Link href="/auth/register">List your business</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container px-4 py-8 sm:py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Business for Sale
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Buy and sell businesses across Australia. Browse listings or list your own.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/search">Browse all listings</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Recent listings – marketplace preview */}
        <section className="container px-4 pb-12 md:pb-16">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Recent listings</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/search">View all</Link>
            </Button>
          </div>
          {recentListings.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentListings.map((listing) => {
                const thumb = listing.listing_images?.[0]?.url;
                const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
                return (
                  <li key={listing.id}>
                    <Link
                      href={`/listing/${listing.slug}`}
                      className="block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                        {thumb ? (
                          <Image src={thumb} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="font-medium line-clamp-2 text-sm sm:text-base">{listing.title}</p>
                        {listing.category && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{listing.category.name}</p>
                        )}
                        {location && <p className="text-xs text-muted-foreground truncate">{location}</p>}
                        <p className="text-sm font-medium mt-1">{formatPrice(listing)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
              <p className="text-muted-foreground">No listings yet. Be the first to list a business.</p>
              {!session?.user && (
                <Button asChild className="mt-4">
                  <Link href="/auth/register">List your business</Link>
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Broker CTA – secondary, only when not logged in */}
        {!session?.user && (
          <section className="border-t border-border bg-muted/30">
            <div className="container px-4 py-8">
              <div className="mx-auto max-w-xl text-center space-y-3">
                <h3 className="font-semibold text-foreground">List your business</h3>
                <p className="text-sm text-muted-foreground">
                  Create a broker account to list businesses for sale and reach buyers across Australia.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/auth/register">Create broker account</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
