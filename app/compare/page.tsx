import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import {
  getComparisonListingIds,
  getComparisonListings,
  getAllPublishedListingsForPicker,
} from "@/lib/actions/comparison";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { ComparisonTable } from "./comparison-table";

export const metadata: Metadata = {
  title: "Compare Listings",
  description: "Compare business listings side-by-side",
};

export default async function ComparePage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/compare");
  }

  const [listingIds, allPickerListings] = await Promise.all([
    getComparisonListingIds(),
    getAllPublishedListingsForPicker(),
  ]);

  const listings =
    listingIds.length > 0 ? await getComparisonListings(listingIds) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-7xl" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:py-10 space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Browse", href: "/search" },
            { label: "Compare Listings" },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Compare Listings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select listings to compare side-by-side.
          </p>
        </div>

        <ComparisonTable
          listings={listings}
          allListings={allPickerListings}
        />
      </main>
    </div>
  );
}
