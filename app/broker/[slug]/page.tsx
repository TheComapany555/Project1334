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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10 space-y-6">

        {/* Broker profile card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

              {/* Avatars */}
              {(profile.photo_url || profile.logo_url) && (
                <div className="flex gap-3 shrink-0">
                  {profile.photo_url && (
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border border-border bg-muted">
                      <Image
                        src={profile.photo_url}
                        alt={profile.name ?? "Profile photo"}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  )}
                  {profile.logo_url && (
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-md overflow-hidden border border-border bg-muted">
                      <Image
                        src={profile.logo_url}
                        alt={profile.company ?? "Logo"}
                        fill
                        className="object-contain p-1"
                        sizes="96px"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Info + actions */}
              <div className="flex flex-1 flex-col gap-3 min-w-0">
                <div className="space-y-0.5">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl leading-snug">
                    {displayName}
                  </h1>
                  {profile.company && profile.name && (
                    <p className="text-sm text-muted-foreground">{profile.company}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
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

        {/* Bio */}
        {profile.bio && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Social links */}
        {(social?.linkedin || social?.facebook || social?.instagram) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Connect</CardTitle>
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
          <CardHeader className="pb-3">
            <CardTitle>Listings by this broker</CardTitle>
            <CardDescription>
              {listings.length === 0
                ? "No published listings yet."
                : `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          {listings.length > 0 && (
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {listings.map((listing) => {
                  const thumb = listing.listing_images?.[0]?.url;
                  return (
                    <li key={listing.id}>
                      <Link
                        href={`/listing/${listing.slug}`}
                        className="flex gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {thumb ? (
                          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded border bg-muted">
                            <Image src={thumb} alt="" fill className="object-cover" sizes="96px" />
                          </div>
                        ) : (
                          <div className="h-20 w-24 shrink-0 rounded border border-dashed bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                          <p className="font-medium text-sm leading-snug line-clamp-2">{listing.title}</p>
                          {listing.category && (
                            <p className="text-xs text-muted-foreground">{listing.category.name}</p>
                          )}
                          <p className="text-sm font-semibold text-foreground mt-1">{formatPrice(listing)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}