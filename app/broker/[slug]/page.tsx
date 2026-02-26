import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/actions/profile";
import { getPublishedListingsByBrokerId } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) {
    return { title: "Broker not found | Salebiz" };
  }
  const title = [profile.name, profile.company].filter(Boolean).join(profile.company ? " · " : "") || "Broker";
  const description = profile.bio?.slice(0, 160) ?? `Broker profile on Salebiz`;
  return {
    title: `${title} | Salebiz`,
    description,
    openGraph: {
      title: `${title} | Salebiz`,
      description,
      ...(profile.photo_url && { images: [{ url: profile.photo_url }] }),
    },
  };
}

function formatPrice(listing: { price_type: string; asking_price: number | null }): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.asking_price));
  }
  return "—";
}

export default async function BrokerProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();
  const listings = await getPublishedListingsByBrokerId(profile.id);

  const displayName = profile.name || profile.company || "Broker";
  const social = profile.social_links;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center shrink-0 font-semibold text-foreground" aria-label="Salebiz home">
            <Image src="/Salebiz.png" alt="" width={100} height={30} className="h-7 w-auto object-contain sm:h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="outline" size="sm" asChild>
              <Link href="/search">Browse listings</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10 space-y-8">

        {/* Broker hero */}
        <Card>
          <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
              {/* Single avatar: profile photo (person) or initial */}
              <div className="shrink-0">
                {profile.photo_url ? (
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-border bg-muted ring-2 ring-primary/10">
                    <Image
                      src={profile.photo_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                      priority
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-border bg-muted text-2xl sm:text-3xl font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {(profile.name?.trim() || profile.company?.trim() || "B").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {displayName}
                  </h1>
                  {/* Company: name + optional logo (clearly labeled) */}
                  {profile.company && (
                    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      {profile.logo_url ? (
                        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1">
                          <span className="relative inline-block h-6 w-6 shrink-0 overflow-hidden rounded-sm bg-background">
                            <Image
                              src={profile.logo_url}
                              alt=""
                              fill
                              className="object-contain p-0.5"
                              sizes="24px"
                            />
                          </span>
                          <span className="text-sm font-medium text-foreground">{profile.company}</span>
                        </span>
                      ) : (
                        <p className="text-sm text-muted-foreground">{profile.company}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {profile.phone && (
                    <Button asChild size="sm">
                      <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>Call</a>
                    </Button>
                  )}
                  {profile.email_public && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${profile.email_public}`}>Email</a>
                    </Button>
                  )}
                  {profile.website && (
                    <Button asChild variant="outline" size="sm">
                      <a href={profile.website} target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        {profile.bio && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Connect */}
        {(social?.linkedin || social?.facebook || social?.instagram) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Connect</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {social.linkedin && (
                <Button variant="outline" size="sm" asChild>
                  <a href={social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </Button>
              )}
              {social.facebook && (
                <Button variant="outline" size="sm" asChild>
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                </Button>
              )}
              {social.instagram && (
                <Button variant="outline" size="sm" asChild>
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Listings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Listings by this broker</CardTitle>
            {listings.length > 0 && (
              <CardDescription>
                {listings.length} listing{listings.length === 1 ? "" : "s"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {listings.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {listings.map((listing) => {
                  const thumb = listing.listing_images?.[0]?.url;
                  return (
                    <li key={listing.id}>
                      <Link
                        href={`/listing/${listing.slug}`}
                        className="flex gap-4 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60 hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {thumb ? (
                          <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            <Image src={thumb} alt="" fill className="object-cover" sizes="112px" />
                          </div>
                        ) : (
                          <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                          <p className="font-medium text-sm leading-snug line-clamp-2">{listing.title}</p>
                          {listing.category && (
                            <p className="text-xs text-muted-foreground">{listing.category.name}</p>
                          )}
                          <p className="text-sm font-semibold text-foreground">{formatPrice(listing)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No published listings yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}