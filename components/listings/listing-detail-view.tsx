import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  TrendingUp,
  BarChart3,
  FileText,
  Sparkles,
  Star,
  Building2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { FeaturedBadge } from "@/components/listings/featured-badge";
import { DescriptionRenderer } from "@/components/listings/description-renderer";
import { FinancialCalculator } from "@/components/listings/financial-calculator";
import { ListingImageGallery } from "@/components/listings/listing-image-gallery";
import { LocationMap } from "@/components/location-map";
import { cn } from "@/lib/utils";

/**
 * Everything the listing detail body needs, decoupled from the DB row so the
 * public page (saved listing) and the in-form preview (unsaved form state) render
 * through exactly the same markup and can never drift apart.
 */
export type ListingDetailData = {
  title: string;
  category: { name: string; slug: string } | null;
  subcategory: { name: string } | null;
  exclusivity: "exclusive" | "open" | null;
  locationText: string;
  price_type: string;
  asking_price: number | null;
  revenue: number | null;
  profit: number | null;
  lease_details: string | null;
  summary: string | null;
  description: string | null;
  images: { id: string; url: string }[];
  highlights: { id: string; label: string; accent?: string | null }[];
  broker: {
    slug: string | null;
    name: string | null;
    company: string | null;
    photo_url: string | null;
  } | null;
  agency: { name: string; slug: string | null; logo_url: string | null } | null;
  featured: boolean;
};

type Props = {
  data: ListingDetailData;
  /** "preview" renders links inert so a broker cannot navigate away mid-edit. */
  mode?: "public" | "preview";
  /** Favourite / compare controls beside the price. */
  titleActions?: ReactNode;
  /** Call button in the broker card (needs listing + broker ids, so the page owns it). */
  callAction?: ReactNode;
  /** Data room, rendered after key details. */
  documents?: ReactNode;
  /** Enquiry form; anchored as #enquiry. */
  enquiry?: ReactNode;
};

const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export function formatListingPrice(listing: {
  price_type: string;
  asking_price: number | null;
}): string {
  if (listing.price_type === "poa") return "Price on application";
  if (listing.asking_price != null)
    return aud.format(Number(listing.asking_price));
  return "";
}

export function ListingDetailView({
  data,
  mode = "public",
  titleActions,
  callAction,
  documents,
  enquiry,
}: Props) {
  const preview = mode === "preview";
  const { broker, agency, highlights, images, locationText } = data;
  const price = formatListingPrice(data);
  const hasContact = !!(broker?.slug || agency?.slug);

  // In preview, a link becomes a plain button: same look, no navigation.
  const outlineLink = (href: string, label: string) =>
    preview ? (
      <Button variant="outline" type="button" className="w-full">
        {label}
      </Button>
    ) : (
      <Button variant="outline" className="w-full" asChild>
        <Link href={href}>{label}</Link>
      </Button>
    );

  const facts: {
    icon: typeof TrendingUp;
    label: string;
    value: string;
    long?: boolean;
  }[] = [];
  if (data.revenue != null)
    facts.push({
      icon: TrendingUp,
      label: "Revenue",
      value: aud.format(Number(data.revenue)),
    });
  if (data.profit != null)
    facts.push({
      icon: BarChart3,
      label: "Profit",
      value: aud.format(Number(data.profit)),
    });
  if (data.lease_details)
    facts.push({
      icon: FileText,
      label: "Lease",
      value: data.lease_details,
      long: true,
    });

  return (
    <>
      {/* Featured banner */}
      {data.featured && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50/50 px-4 py-2.5 text-sm dark:bg-amber-950/20">
          <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            Featured listing :
          </span>
          <span className="min-w-0 text-muted-foreground">
            This listing is promoted for increased visibility.
          </span>
        </div>
      )}

      <header className="min-w-0 space-y-4 pb-2">
        <PageBreadcrumb
          items={
            preview
              ? [{ label: "Home" }, { label: "Browse" }, { label: data.title }]
              : [
                  { label: "Home", href: "/" },
                  { label: "Browse", href: "/search" },
                  { label: data.title },
                ]
          }
        />

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {data.category &&
              (preview ? (
                <span className="text-sm text-muted-foreground">
                  {data.category.name}
                </span>
              ) : (
                <Link
                  href={`/search?category=${data.category.slug}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {data.category.name}
                </Link>
              ))}
            {data.subcategory && (
              <>
                <span className="text-muted-foreground/40 text-sm" aria-hidden>
                  ·
                </span>
                <span className="text-sm text-muted-foreground">
                  {data.subcategory.name}
                </span>
              </>
            )}
            {data.exclusivity && (
              <span className="inline-flex items-center rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {data.exclusivity === "exclusive"
                  ? "Exclusive"
                  : "Open listing"}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-4xl">
                  {data.title}
                </h1>
                {data.featured && <FeaturedBadge />}
              </div>
              {locationText && (
                <p className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-words text-sm text-muted-foreground sm:text-base">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {locationText}
                </p>
              )}
            </div>
            {titleActions && (
              <div className="flex shrink-0 items-center gap-1.5">
                {titleActions}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body: story on the left, decision panel on the right. DOM order is
          gallery → panel → story, so on phones the price and contact come
          straight after the photos rather than at the very bottom. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {images.length > 0 && (
          <Card className="overflow-hidden py-0 shadow-lg shadow-black/5 lg:col-start-1 dark:shadow-black/30">
            <CardContent className="p-0">
              <ListingImageGallery images={images} title={data.title} />
            </CardContent>
          </Card>
        )}

        <aside
          aria-label="Price and contact"
          className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <Card className="gap-0 py-0 lg:sticky lg:top-24">
            <div className="space-y-1 p-5">
              <p className="text-sm text-muted-foreground">
                {data.price_type === "poa" ? "Price" : "Asking price"}
              </p>
              <p
                className={cn(
                  "font-semibold tracking-tight tabular-nums text-foreground",
                  price && data.price_type !== "poa" ? "text-3xl" : "text-xl",
                )}
              >
                {price || "Contact broker"}
              </p>
            </div>

            {facts.length > 0 && (
              <dl className="divide-y divide-border border-t border-border">
                {facts.map((f) => (
                  <div
                    key={f.label}
                    className={cn(
                      "px-5 py-3 text-sm",
                      f.long
                        ? "space-y-1"
                        : "flex items-center justify-between gap-3",
                    )}
                  >
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <f.icon
                        className="h-4 w-4 text-muted-foreground/70"
                        aria-hidden
                      />
                      {f.label}
                    </dt>
                    <dd
                      className={cn(
                        "text-foreground",
                        f.long ? "leading-relaxed" : "font-medium tabular-nums",
                      )}
                    >
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {hasContact && (
              <div className="space-y-4 border-t border-border bg-muted/30 p-5">
                {broker?.slug ? (
                  <div className="flex min-w-0 items-center gap-3">
                    {broker.photo_url ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        <Image
                          src={broker.photo_url}
                          alt={broker.name ?? "Broker"}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-semibold text-muted-foreground">
                        {(broker.name ?? "B").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-snug">
                        {broker.name ?? broker.company ?? "Broker"}
                      </p>
                      {agency && (
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          {agency.logo_url && (
                            <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded">
                              <Image
                                src={agency.logo_url}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="20px"
                              />
                            </div>
                          )}
                          {agency.slug && !preview ? (
                            <Link
                              href={`/agency/${agency.slug}`}
                              className="truncate text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                              {agency.name}
                            </Link>
                          ) : (
                            <span className="truncate text-sm text-muted-foreground">
                              {agency.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  agency && (
                    <div className="flex min-w-0 items-center gap-3">
                      {agency.logo_url ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          <Image
                            src={agency.logo_url}
                            alt={agency.name}
                            fill
                            className="object-contain p-0.5"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                          <Building2
                            className="h-5 w-5 text-muted-foreground"
                            aria-hidden
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-snug">
                          {agency.name}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Agency
                        </p>
                      </div>
                    </div>
                  )
                )}

                <div className="grid gap-2">
                  <Button className="w-full" asChild>
                    <a href="#enquiry">Enquire about this business</a>
                  </Button>
                  <div
                    className={cn(
                      "grid gap-2",
                      callAction && broker?.slug && "grid-cols-2",
                    )}
                  >
                    {broker?.slug && callAction}
                    {broker?.slug
                      ? outlineLink(`/broker/${broker.slug}`, "View profile")
                      : agency?.slug &&
                        outlineLink(`/agency/${agency.slug}`, "View agency")}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </aside>

        <div className="min-w-0 space-y-10 lg:col-start-1">
          {/* Why This Business? — highlight selling points */}
          {highlights.length > 0 && (
            <section aria-labelledby="ld-highlights" className="space-y-4">
              <h2
                id="ld-highlights"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight"
              >
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                Why this business?
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        h.accent === "primary"
                          ? "bg-primary/15 text-primary"
                          : h.accent === "warning"
                            ? "bg-warning/15 text-[var(--warning-foreground)]"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Check
                        className="h-3.5 w-3.5"
                        strokeWidth={3}
                        aria-hidden
                      />
                    </span>
                    <span className="font-medium text-foreground">
                      {h.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* About: summary as the lead, description as the body. Open prose
              (no card) at a readable measure. */}
          {(data.summary || data.description) && (
            <section aria-labelledby="ld-about" className="space-y-4">
              <h2
                id="ld-about"
                className="text-lg font-semibold tracking-tight"
              >
                About this business
              </h2>
              {data.summary && (
                <p className="max-w-[65ch] whitespace-pre-wrap text-base leading-relaxed text-foreground sm:text-lg">
                  {data.summary}
                </p>
              )}
              {data.description && (
                <div
                  className={cn(
                    "max-w-[70ch] text-muted-foreground",
                    data.summary && "border-t border-border pt-4",
                  )}
                >
                  <DescriptionRenderer content={data.description} />
                </div>
              )}
            </section>
          )}

          {documents}

          {/* Financial Calculator */}
          {data.price_type !== "poa" && data.asking_price != null && (
            <FinancialCalculator
              askingPrice={Number(data.asking_price)}
              profit={data.profit ? Number(data.profit) : null}
            />
          )}

          {/* Interactive Map */}
          {locationText && <LocationMap location={locationText} />}

          {/* Enquiry form */}
          {enquiry && (
            <div id="enquiry" className="scroll-mt-24">
              {enquiry}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Stand-in for the enquiry form while previewing: shows buyers get a form here
 * without letting the broker send an enquiry to their own listing.
 */
export function EnquiryPreviewPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Send an enquiry</CardTitle>
        <CardDescription>
          Buyers contact you from this form once the listing is live. It is
          switched off in preview.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2" aria-hidden>
        {["Name", "Email", "Phone", "Message"].map((label) => (
          <div
            key={label}
            className={cn(
              "space-y-1.5",
              label === "Message" && "sm:col-span-2",
            )}
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div
              className={cn(
                "rounded-md border border-input bg-muted/40",
                label === "Message" ? "h-24" : "h-9",
              )}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
