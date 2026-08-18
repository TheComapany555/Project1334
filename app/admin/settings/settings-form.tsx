"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Home,
  Loader2,
  Mail,
  Search,
  Tag,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  setListingsComingSoon,
  setBasicListingsSearchable,
} from "@/lib/actions/site-settings";
import { cn } from "@/lib/utils";

const AFFECTED_SURFACES = [
  { icon: Home, label: "Homepage listings" },
  { icon: Search, label: "Search & browse" },
  { icon: FileText, label: "Listing detail pages" },
  { icon: Building2, label: "Broker & agency profiles" },
  { icon: Heart, label: "Saved & compare" },
  { icon: Mail, label: "Sitemap & buyer alert emails" },
] as const;

export function SettingsForm({
  initialComingSoon,
  initialUpdatedAt,
  initialBasicSearchable,
  basicSearchableAvailable,
}: {
  initialComingSoon: boolean;
  initialUpdatedAt: string | null;
  initialBasicSearchable: boolean;
  basicSearchableAvailable: boolean;
}) {
  const [comingSoon, setComingSoon] = useState(initialComingSoon);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  // The direction the admin is about to confirm; null = dialog closed.
  const [pendingNext, setPendingNext] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const [basicSearchable, setBasicSearchable] = useState(initialBasicSearchable);
  const [pendingBasicNext, setPendingBasicNext] = useState<boolean | null>(null);
  const [isBasicPending, startBasicTransition] = useTransition();

  function confirmBasicChange() {
    if (pendingBasicNext === null) return;
    const next = pendingBasicNext;
    setPendingBasicNext(null);
    startBasicTransition(async () => {
      const result = await setBasicListingsSearchable(next);
      if (result.ok) {
        setBasicSearchable(next);
        toast.success(
          next
            ? "Basic listings now appear in browse and search."
            : "Basic listings are back to direct-link only.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function confirmChange() {
    if (pendingNext === null) return;
    const next = pendingNext;
    setPendingNext(null);
    startTransition(async () => {
      const result = await setListingsComingSoon(next);
      if (result.ok) {
        setComingSoon(next);
        setUpdatedAt(result.updatedAt ?? new Date().toISOString());
        toast.success(
          next
            ? "Listings hidden, visitors now see the Coming Soon card."
            : "Listings are visible to visitors again.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Listings visibility</CardTitle>
            <CardDescription>
              Control whether visitors can see listings anywhere on the public
              site.
            </CardDescription>
          </div>
          <Badge variant={comingSoon ? "warning" : "success"}>
            {comingSoon ? "Coming Soon" : "Live"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current state */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              comingSoon
                ? "border-warning/30 bg-warning/10"
                : "border-success/30 bg-success/10",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                comingSoon
                  ? "bg-warning/15 text-[var(--warning-foreground)] dark:text-warning"
                  : "bg-success/15 text-success",
              )}
            >
              {comingSoon ? (
                <EyeOff className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <Eye className="h-4.5 w-4.5" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {comingSoon
                  ? "Coming Soon mode is active"
                  : "Listings are live"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                {comingSoon
                  ? "Visitors and buyers see a Coming Soon card everywhere listings normally appear."
                  : "Visitors can browse all published listings across the site."}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between gap-6 rounded-lg border border-border p-4">
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="listings-coming-soon"
                className="text-sm font-medium"
              >
                Hide all listings
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Show a &ldquo;Coming Soon&rdquo; card in place of real
                listings. Flip it back any time — changes apply instantly, no
                deploy needed.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {isPending && (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Saving"
                />
              )}
              <Switch
                id="listings-coming-soon"
                checked={comingSoon}
                onCheckedChange={(next) => setPendingNext(next)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Scope */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What this affects
            </p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {AFFECTED_SURFACES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground"
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-muted-foreground/70"
                    aria-hidden
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Broker and admin dashboards are never affected.</p>
            <div className="flex items-center gap-3">
              {updatedAt && (
                <span suppressHydrationWarning>
                  Updated{" "}
                  {formatDistanceToNow(new Date(updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                View live site
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Basic listings in browse &amp; search</CardTitle>
            <CardDescription>
              Choose whether free Basic-tier listings appear on the homepage and
              in search, or stay reachable by direct link only.
            </CardDescription>
          </div>
          <Badge variant={basicSearchable ? "success" : "secondary"}>
            {basicSearchable ? "Shown" : "Direct link only"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {!basicSearchableAvailable && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
              This setting needs the{" "}
              <code className="text-xs">basic_listings_searchable</code>{" "}
              migration to be applied to the database before it can be changed.
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              basicSearchable
                ? "border-success/30 bg-success/10"
                : "border-border bg-muted/40",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                basicSearchable
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {basicSearchable ? (
                <Eye className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <Tag className="h-4.5 w-4.5" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {basicSearchable
                  ? "All published listings appear in browse and search"
                  : "Only paid listings appear in browse and search"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                {basicSearchable
                  ? "Basic, Standard and Featured listings are all discoverable. Featured placements still rank first."
                  : "Basic (free) listings stay off the homepage and search — they are reachable only by their direct link. Standard and Featured tiers are what buy that exposure."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 rounded-lg border border-border p-4">
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="basic-listings-searchable"
                className="text-sm font-medium"
              >
                Show Basic listings in browse &amp; search
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Turn this on if listings look missing from the public site —
                imported listings are Basic tier by default. Changes apply
                instantly, no deploy needed.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {isBasicPending && (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Saving"
                />
              )}
              <Switch
                id="basic-listings-searchable"
                checked={basicSearchable}
                onCheckedChange={(next) => setPendingBasicNext(next)}
                disabled={isBasicPending || !basicSearchableAvailable}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This does not change any listing&rsquo;s tier or price — it only
            controls where Basic listings are shown.
          </p>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingBasicNext !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBasicNext(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBasicNext
                ? "Show Basic listings in browse & search?"
                : "Hide Basic listings from browse & search?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBasicNext
                ? "Every published listing — including free Basic-tier ones — will appear on the homepage and in search immediately. Paid Standard and Featured listings keep their ranking advantage, but Standard will no longer be required for a listing to be discoverable."
                : "Basic-tier listings will disappear from the homepage and search, and will be reachable only by their direct link. Standard and Featured listings are unaffected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBasicChange}>
              {pendingBasicNext ? "Show Basic listings" : "Hide Basic listings"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingNext !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNext(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingNext
                ? "Hide all listings?"
                : "Make listings visible to everyone?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingNext
                ? "Visitors and buyers will immediately see a Coming Soon card instead of listings — on the homepage, search, listing pages, profiles, and in buyer alert emails. You can turn this off at any time."
                : "All published listings become publicly visible again, immediately — including search, listing pages, and the sitemap."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>
              {pendingNext ? "Hide listings" : "Show listings"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
