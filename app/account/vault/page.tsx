import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getBuyerVaultListings } from "@/lib/actions/data-room";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderLock, ArrowRight, Clock, ShieldOff, CheckCircle2, FileText } from "lucide-react";
import {
  DATA_ROOM_ACCESS_STATUS_LABELS,
  type DataRoomAccessStatus,
} from "@/lib/types/data-room";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data Room Vault",
  description: "Documents brokers have shared with you.",
};

const STATUS_TONE: Record<DataRoomAccessStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  denied: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  revoked: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  expired: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default async function BuyerVaultPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/account/vault");
  }
  if (session.user.role === "broker") redirect("/dashboard");
  if (session.user.role === "admin") redirect("/admin");

  const listings = await getBuyerVaultListings();

  return (
    <>
      <PublicHeader session={session} />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Account", href: "/account" },
            { label: "Vault" },
          ]}
        />

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderLock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Data Room Vault</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Documents brokers have shared with you. Approved listings appear
            here for quick access.
          </p>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <FolderLock className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You haven&apos;t requested data-room access on any listings yet.
              </p>
              <Button asChild className="mt-2">
                <Link href="/search">Browse listings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {listings.map(({ access, listing, file_count, last_file_added_at }) => {
              const isApproved = access.status === "approved";
              const expired =
                access.status === "approved" &&
                access.expires_at &&
                new Date(access.expires_at) < new Date();
              const status: DataRoomAccessStatus = expired ? "expired" : access.status;
              return (
                <Card key={access.id} className="overflow-hidden">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/listing/${listing.slug}`}
                        className="text-base font-medium hover:underline"
                      >
                        {listing.title}
                      </Link>
                      {listing.location_text && (
                        <p className="text-xs text-muted-foreground">
                          {listing.location_text}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${STATUS_TONE[status]}`}
                        >
                          <StatusIcon status={status} />
                          {DATA_ROOM_ACCESS_STATUS_LABELS[status]}
                        </span>
                        {isApproved && !expired && (
                          <>
                            <span className="text-muted-foreground inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {file_count} file{file_count === 1 ? "" : "s"}
                            </span>
                            {last_file_added_at && (
                              <span className="text-muted-foreground">
                                Last update {formatDate(last_file_added_at)}
                              </span>
                            )}
                            {access.expires_at && (
                              <span className="text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Expires {formatDate(access.expires_at)}
                              </span>
                            )}
                            {!access.download_allowed && (
                              <Badge variant="outline" className="text-[10px]">
                                Preview only
                              </Badge>
                            )}
                          </>
                        )}
                        {access.status === "denied" && access.denial_reason && (
                          <span className="text-muted-foreground">
                            {access.denial_reason}
                          </span>
                        )}
                      </div>
                    </div>
                    {isApproved && !expired ? (
                      <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                        <Link href={`/account/vault/${listing.id}`}>
                          Open vault
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="ghost" size="sm" className="shrink-0">
                        <Link href={`/listing/${listing.slug}`}>
                          View listing
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function StatusIcon({ status }: { status: DataRoomAccessStatus }) {
  if (status === "approved") return <CheckCircle2 className="h-3 w-3" />;
  if (status === "expired" || status === "revoked") return <ShieldOff className="h-3 w-3" />;
  if (status === "pending") return <Clock className="h-3 w-3" />;
  return <ShieldOff className="h-3 w-3" />;
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
