import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getBuyerVaultListing } from "@/lib/actions/data-room";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FolderLock, ArrowLeft } from "lucide-react";
import { BuyerVaultBrowser } from "./buyer-vault-browser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vault",
};

type Props = {
  params: Promise<{ listingId: string }>;
};

export default async function BuyerVaultListingPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/account/vault`);
  }
  if (session.user.role !== "user") redirect("/account/vault");

  const { listingId } = await params;
  const result = await getBuyerVaultListing(listingId);

  if (!result.ok && result.reason === "no_access") {
    notFound();
  }

  return (
    <>
      <PublicHeader session={session} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <PageBreadcrumb
          items={[
            { label: "Account", href: "/account" },
            { label: "Vault", href: "/account/vault" },
            { label: result.ok ? result.data.listing.title : "Listing" },
          ]}
        />

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/account/vault">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FolderLock className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold truncate">
                {result.ok ? result.data.listing.title : "Listing"}
              </h1>
            </div>
            {result.ok && result.data.listing.location_text && (
              <p className="text-sm text-muted-foreground">
                {result.data.listing.location_text}
              </p>
            )}
          </div>
        </div>

        {!result.ok ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {result.reason === "expired"
                  ? "Your access to this data room has expired. Contact the broker if you need to extend it."
                  : result.reason === "not_approved"
                    ? "Your access request is still being reviewed by the broker. You&apos;ll be notified once it&apos;s approved."
                    : result.error}
              </p>
              <Button asChild variant="outline">
                <Link href="/account/vault">Back to vault</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {result.data.expiresAt && (
              <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="py-3 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                  Your access expires {formatDate(result.data.expiresAt)}.
                  {!result.data.downloadAllowed && (
                    <span className="ml-2">Downloads are disabled for this data room.</span>
                  )}
                </CardContent>
              </Card>
            )}
            <BuyerVaultBrowser
              folders={result.data.folders}
              documents={result.data.documents}
              listingSlug={result.data.listing.slug}
              downloadAllowed={result.data.downloadAllowed}
              approvedAt={result.data.access.reviewed_at}
            />
          </>
        )}
      </main>
    </>
  );
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
