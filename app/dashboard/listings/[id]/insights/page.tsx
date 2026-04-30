import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getListingById } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import { AIInsightsPanel } from "@/components/listings/ai-insights-panel";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListingInsightsPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description={listing.title}
        backHref={`/dashboard/listings/${listing.id}/edit`}
        backLabel="Back to listing"
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
