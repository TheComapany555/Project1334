"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Building2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Heart,
  Home,
  Loader2,
  Mail,
  Search,
  Star,
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
  setBillingEnabled,
  setPromoteFeatured,
} from "@/lib/actions/site-settings";
import { cn } from "@/lib/utils";

const FREE_MODE_EFFECTS = [
  "No subscription needed. Every broker and agency gets the full dashboard",
  "Listings publish immediately, with no visibility-level payment",
  "All published listings appear on the homepage and in search",
] as const;

/** What Featured buys once it is promoted during free mode. */
const FEATURED_SELLING_POINTS = [
  "Shown on the homepage featured rail",
  "Ranked above other listings in search",
  "Featured badge on the listing card",
] as const;

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
  initialBillingEnabled,
  billingAvailable,
  initialPromoteFeatured,
  promoteFeaturedAvailable,
}: {
  initialComingSoon: boolean;
  initialUpdatedAt: string | null;
  initialBasicSearchable: boolean;
  basicSearchableAvailable: boolean;
  initialBillingEnabled: boolean;
  billingAvailable: boolean;
  initialPromoteFeatured: boolean;
  promoteFeaturedAvailable: boolean;
}) {
  const [billingEnabled, setBillingEnabledState] = useState(initialBillingEnabled);
  const [promoteFeatured, setPromoteFeaturedState] = useState(initialPromoteFeatured);
  const [pendingPromoteNext, setPendingPromoteNext] = useState<boolean | null>(null);
  const [isPromotePending, startPromoteTransition] = useTransition();
  const [pendingBillingNext, setPendingBillingNext] = useState<boolean | null>(null);
  const [isBillingPending, startBillingTransition] = useTransition();

  function confirmBillingChange() {
    if (pendingBillingNext === null) return;
    const next = pendingBillingNext;
    setPendingBillingNext(null);
    startBillingTransition(async () => {
      const result = await setBillingEnabled(next);
      if (result.ok) {
        setBillingEnabledState(next);
        toast.success(
          next
            ? "Billing is on. Subscriptions and listing payments apply again."
            : "Free mode is on. All paywalls are switched off.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function confirmPromoteChange() {
    if (pendingPromoteNext === null) return;
    const next = pendingPromoteNext;
    setPendingPromoteNext(null);
    startPromoteTransition(async () => {
      const result = await setPromoteFeatured(next);
      if (result.ok) {
        setPromoteFeaturedState(next);
        toast.success(
          next
            ? "Featured upgrades are now offered to brokers."
            : "Featured upgrades are hidden again.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

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
            <CardTitle>Payments &amp; pricing</CardTitle>
            <CardDescription>
              Switch all subscription and listing paywalls on or off across the
              platform. Nothing is deleted: plans, prices and existing
              subscriptions are kept and apply again when billing is turned back
              on.
            </CardDescription>
          </div>
          <Badge variant={billingEnabled ? "secondary" : "success"}>
            {billingEnabled ? "Billing on" : "Free mode"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {!billingAvailable && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
              This setting needs the{" "}
              <code className="text-xs">billing_enabled</code> migration to be
              applied to the database before it can be changed. Until then the
              platform runs in free mode.
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              billingEnabled
                ? "border-border bg-muted/40"
                : "border-success/30 bg-success/10",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                billingEnabled
                  ? "bg-muted text-muted-foreground"
                  : "bg-success/15 text-success",
              )}
            >
              {billingEnabled ? (
                <CreditCard className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <Gift className="h-4.5 w-4.5" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {billingEnabled
                  ? "Billing is on"
                  : "Free mode is on, everything is free"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                {billingEnabled
                  ? "Agencies need an active subscription to use the dashboard, and Standard/Featured listings require payment before they publish. Per-agency waivers and $0 plans still work."
                  : "No subscription or listing payment is required anywhere. Brokers and agencies can sign up, create listings and publish straight away."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 rounded-lg border border-border p-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="billing-enabled" className="text-sm font-medium">
                Charge for subscriptions and listings
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Turn this off to make the whole platform free. Turn it back on
                whenever you want to start charging again. Changes apply
                instantly, no deploy needed.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {isBillingPending && (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Saving"
                />
              )}
              <Switch
                id="billing-enabled"
                checked={billingEnabled}
                onCheckedChange={(next) => setPendingBillingNext(next)}
                disabled={isBillingPending || !billingAvailable}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What free mode does
            </p>
            <ul className="mt-3 space-y-2">
              {FREE_MODE_EFFECTS.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                  aria-hidden
                />
                {promoteFeatured
                  ? "Subscribe and Payments pages are hidden, but Featured upgrades are still offered (see below)"
                  : "Subscribe, Payments and Featured-upgrade pages are hidden from brokers"}
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Existing paid Stripe subscriptions keep billing as normal either
            way. To stop charging a specific agency, use &ldquo;Waive
            subscription&rdquo; on that agency instead.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Featured listing upgrades</CardTitle>
            <CardDescription>
              Sell Featured placements to brokers even while the rest of the
              platform is free. Brokers are offered the upgrade once, right
              after they publish a listing.
            </CardDescription>
          </div>
          <Badge variant={promoteFeatured ? "success" : "secondary"}>
            {promoteFeatured ? "Promoted" : "Hidden"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {!promoteFeaturedAvailable && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
              This setting needs the{" "}
              <code className="text-xs">promote_featured</code> migration to be
              applied to the database before it can be changed.
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              promoteFeatured
                ? "border-success/30 bg-success/10"
                : "border-border bg-muted/40",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                promoteFeatured
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Star className="h-4.5 w-4.5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {promoteFeatured
                  ? "Brokers are offered Featured upgrades"
                  : "Featured upgrades are hidden"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                {promoteFeatured
                  ? "After publishing, brokers see a one-time offer to feature that listing. They can also feature any listing from its actions menu."
                  : "No upgrade is offered anywhere. Publishing a listing is completely free and nothing is promoted to brokers."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 rounded-lg border border-border p-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="promote-featured" className="text-sm font-medium">
                Offer Featured upgrades to brokers
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Works independently of the billing switch above, so you can earn
                from Featured placements while everything else stays free.
                Changes apply instantly, no deploy needed.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {isPromotePending && (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Saving"
                />
              )}
              <Switch
                id="promote-featured"
                checked={promoteFeatured}
                onCheckedChange={(next) => setPendingPromoteNext(next)}
                disabled={isPromotePending || !promoteFeaturedAvailable}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What a broker pays for
            </p>
            <ul className="mt-3 space-y-2">
              {FEATURED_SELLING_POINTS.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Free listings stay published and searchable either way. Featured is
            an optional one-time purchase, priced under Pricing &amp; Plans.
          </p>
        </CardContent>
      </Card>

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
        open={pendingBillingNext !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBillingNext(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBillingNext
                ? "Turn billing back on?"
                : "Make the whole platform free?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBillingNext
                ? "Agencies without an active subscription (or a waiver) will see the subscription lock screen again, new Standard and Featured listings will require payment before publishing, and Basic listings will drop out of browse and search unless the Basic-listings toggle below is on. Listings that are already published stay published."
                : "Every paywall switches off immediately: no subscription is needed to use the dashboard, listings publish without payment, all published listings become discoverable, and the Subscribe / Payments / Featured-upgrade pages are hidden from brokers. Plans and prices are kept so you can switch billing back on later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBillingChange}>
              {pendingBillingNext ? "Turn billing on" : "Make everything free"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingPromoteNext !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPromoteNext(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingPromoteNext
                ? "Start offering Featured upgrades?"
                : "Stop offering Featured upgrades?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPromoteNext
                ? "After publishing a listing, brokers will be offered a one-time paid upgrade to feature it on the homepage and at the top of search. They are asked only once per listing, and publishing stays free. Make sure your Featured packages are priced correctly under Pricing and Plans first."
                : "The offer disappears immediately and the Feature action is hidden from brokers. Listings that are already featured keep their placement until it expires, and nothing is refunded."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPromoteChange}>
              {pendingPromoteNext ? "Start offering" : "Stop offering"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
