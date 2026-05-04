import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getListingById } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import { AIInsightsPanel } from "@/components/listings/ai-insights-panel";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function ListingInsightsPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const sp = await searchParams;
  const from = sp?.from;

  let backHref = "/dashboard/listings";
  let backLabel = "Back to listings";
  if (from === "analytics") {
    backHref = "/dashboard/analytics";
    backLabel = "Back to analytics";
  } else if (from === "edit") {
    backHref = `/dashboard/listings/${listing.id}/edit`;
    backLabel = "Back to edit listing";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description={listing.title}
        backHref={backHref}
        backLabel={backLabel}
        action={
          listing.status === "published" && listing.slug ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link
                href={`/listing/${listing.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View public page
              </Link>
            </Button>
          ) : undefined
        }
      />
      <AIInsightsPanel listingId={listing.id} />
    </div>
  );
}
