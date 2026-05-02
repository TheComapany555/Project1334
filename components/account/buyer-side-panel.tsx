"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { format, formatDistanceToNow, isThisYear, isToday, isYesterday } from "date-fns";
import {
  ArrowRight,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Compass,
  Heart,
  Inbox,
  Loader2,
  MapPin,
  MessageSquare,
  PencilLine,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { AlertPreferenceDialog } from "@/components/account/alert-preference-dialog";
import {
  deleteAlertPreference,
  toggleAlertPreference,
} from "@/lib/actions/buyer-alert-preferences";
import type {
  BuyerAlertPreference,
  BuyerEnquiryRow,
  BuyerMatchedListing,
  BuyerPanelSnapshot,
  BuyerSavedListing,
  BuyerSentToMeRow,
} from "@/lib/types/buyer-panel";

type CategoryOption = { id: string; name: string };

type Props = {
  snapshot: BuyerPanelSnapshot;
  categories: CategoryOption[];
};

// ─── Section accent palette (used on the icon badge only — not the header bg) ──
const ACCENTS = {
  saved: {
    text: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
    ring: "ring-pink-500/20",
  },
  enquiries: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
  },
  sent: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
  },
  alerts: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
  },
  matched: {
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/20",
  },
} as const;

export function BuyerSidePanel({ snapshot, categories }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [alerts, setAlerts] = useState<BuyerAlertPreference[]>(snapshot.alerts);

  const variants: Variants = reducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
      };
  const containerVariants: Variants = reducedMotion
    ? {}
    : { visible: { transition: { staggerChildren: 0.06 } } };

  const activeAlertCount = alerts.filter((a) => a.is_active).length;

  return (
    <motion.aside
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4"
      aria-label="Your activity panel"
    >
      <motion.div variants={variants}>
        <PanelHeader
          savedCount={snapshot.saved.total}
          enquiryCount={snapshot.enquiries.total}
          matchedCount={snapshot.matched.total}
          activeAlertCount={activeAlertCount}
        />
      </motion.div>

      <motion.div variants={variants}>
        <MatchedForYouSection
          items={snapshot.matched.items}
          total={snapshot.matched.total}
          hasActiveAlerts={activeAlertCount > 0}
        />
      </motion.div>

      <motion.div variants={variants}>
        <SavedListingsSection
          items={snapshot.saved.items}
          total={snapshot.saved.total}
        />
      </motion.div>

      <motion.div variants={variants}>
        <MyEnquiriesSection
          items={snapshot.enquiries.items}
          total={snapshot.enquiries.total}
        />
      </motion.div>

      <motion.div variants={variants}>
        <SentToMeSection
          items={snapshot.sentToMe.items}
          total={snapshot.sentToMe.total}
        />
      </motion.div>

      <motion.div variants={variants}>
        <MyAlertsSection alerts={alerts} setAlerts={setAlerts} categories={categories} />
      </motion.div>
    </motion.aside>
  );
}

// ─── Panel header (gradient + at-a-glance stats) ───────────────────────────

function PanelHeader({
  savedCount,
  enquiryCount,
  matchedCount,
  activeAlertCount,
}: {
  savedCount: number;
  enquiryCount: number;
  matchedCount: number;
  activeAlertCount: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground/70">
          <Compass className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Your activity</h2>
          <p className="text-[11px] text-muted-foreground">
            Saved listings, enquiries, and alerts in one place.
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2">
        <StatChip
          label="Matches"
          value={matchedCount}
          tone={ACCENTS.matched}
          icon={<BellRing className="h-3 w-3" aria-hidden />}
          pulse={matchedCount > 0}
        />
        <StatChip
          label="Saved"
          value={savedCount}
          tone={ACCENTS.saved}
          icon={<Heart className="h-3 w-3" aria-hidden />}
        />
        <StatChip
          label="Enquiries"
          value={enquiryCount}
          tone={ACCENTS.enquiries}
          icon={<MessageSquare className="h-3 w-3" aria-hidden />}
        />
        <StatChip
          label="Alerts"
          value={activeAlertCount}
          tone={ACCENTS.alerts}
          icon={<Bell className="h-3 w-3" aria-hidden />}
        />
      </dl>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
  icon,
  pulse,
}: {
  label: string;
  value: number;
  tone: (typeof ACCENTS)[keyof typeof ACCENTS];
  icon: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col items-start rounded-lg border border-border/60 bg-background p-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          tone.bg,
          tone.text,
        )}
      >
        <span className="relative inline-flex">
          {icon}
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-90">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
            </span>
          )}
        </span>
        {label}
      </span>
      <span className="mt-1 text-lg font-semibold tabular-nums leading-none text-foreground">
        {value}
      </span>
    </div>
  );
}

// ─── Section header (consistent + tinted) ──────────────────────────────────

type SectionAccent = (typeof ACCENTS)[keyof typeof ACCENTS];

function SectionHeader({
  icon,
  title,
  description,
  badge,
  accent,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  accent: SectionAccent;
  action?: React.ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
      <div className="min-w-0 flex-1">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-md ring-1",
              accent.bg,
              accent.ring,
              accent.text,
            )}
          >
            {icon}
          </span>
          <span className="truncate">{title}</span>
          {badge}
        </CardTitle>
        {description && (
          <CardDescription className="text-[11px] mt-1 leading-snug">
            {description}
          </CardDescription>
        )}
      </div>
      {action}
    </CardHeader>
  );
}

// ─── Matched for you section (Feature 3) ───────────────────────────────────

function MatchedForYouSection({
  items,
  total,
  hasActiveAlerts,
}: {
  items: BuyerMatchedListing[];
  total: number;
  hasActiveAlerts: boolean;
}) {
  const accent = ACCENTS.matched;
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        accent={accent}
        icon={<BellRing className="h-3 w-3" aria-hidden />}
        title="Matched for you"
        description="Listings the alert engine flagged based on your preferences."
        badge={<CountBadge value={total} />}
      />
      <Separator />
      <CardContent className="p-0">
        {items.length === 0 ? (
          <SectionEmpty
            accent={accent}
            icon={<BellRing className="h-5 w-5" />}
            title={hasActiveAlerts ? "No matches yet" : "Set an alert to see matches"}
            hint={
              hasActiveAlerts
                ? "We'll drop new listings here the moment they match an alert you've saved."
                : "Create an alert below and we'll watch for matching listings on your behalf."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.match_id}
                className="px-4 py-3 transition-colors hover:bg-muted/30"
              >
                {item.listing ? (
                  <div className="flex items-start gap-3">
                    <ListingThumb
                      url={item.listing.cover_image_url}
                      alt={item.listing.title}
                      seed={item.listing.title}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/listing/${item.listing.slug}`}
                        className="text-sm font-medium leading-tight truncate hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors"
                      >
                        {item.listing.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <PriceTag
                          amount={item.listing.asking_price}
                          type={item.listing.price_type}
                        />
                        {item.listing.location_text && (
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            {item.listing.location_text}
                          </span>
                        )}
                      </div>
                      {(item.matched_for || item.preference_label) && (
                        <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1",
                              accent.bg,
                              accent.ring,
                              accent.text,
                            )}
                          >
                            <BellRing className="h-2.5 w-2.5" aria-hidden />
                            Matched
                          </span>{" "}
                          <span className="ml-1">
                            {item.preference_label || item.matched_for}
                          </span>
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                        {compactDate(item.matched_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">(Listing removed)</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Saved listings section ────────────────────────────────────────────────

function SavedListingsSection({
  items,
  total,
}: {
  items: BuyerSavedListing[];
  total: number;
}) {
  const accent = ACCENTS.saved;
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        accent={accent}
        icon={<Heart className="h-3 w-3" aria-hidden />}
        title="Saved listings"
        description="Auto-saved when you enquire — plus anything you bookmark."
        badge={<CountBadge value={total} />}
        action={
          total > 0 ? (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link href="/saved">
                View all
                <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />
      <Separator />
      <CardContent className="p-0">
        {items.length === 0 ? (
          <SectionEmpty
            accent={accent}
            icon={<Heart className="h-5 w-5" />}
            title="No saved listings yet"
            hint="Browse listings and tap the heart, or send an enquiry — it'll appear here."
            action={
              <Button asChild size="sm" className="mt-3">
                <Link href="/search">
                  <Compass className="mr-1.5 h-3.5 w-3.5" />
                  Browse listings
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/listing/${item.slug}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <ListingThumb
                    url={item.cover_image_url}
                    alt={item.title}
                    seed={item.title}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <PriceTag amount={item.asking_price} type={item.price_type} />
                      {item.location_text && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {item.location_text}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                    {compactDate(item.saved_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── My enquiries section ──────────────────────────────────────────────────

function MyEnquiriesSection({
  items,
  total,
}: {
  items: BuyerEnquiryRow[];
  total: number;
}) {
  const accent = ACCENTS.enquiries;
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        accent={accent}
        icon={<MessageSquare className="h-3 w-3" aria-hidden />}
        title="My enquiries"
        description="Listings you've contacted brokers about."
        badge={<CountBadge value={total} />}
      />
      <Separator />
      <CardContent className="p-0">
        {items.length === 0 ? (
          <SectionEmpty
            accent={accent}
            icon={<Inbox className="h-5 w-5" />}
            title="No enquiries yet"
            hint="When you contact a broker, the conversation lives here."
            action={
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/search">Find a business to enquire on</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <ListingThumb
                    url={item.listing?.cover_image_url ?? null}
                    alt={item.listing?.title ?? "Listing"}
                    seed={item.listing?.title ?? "?"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.listing ? (
                          <Link
                            href={`/listing/${item.listing.slug}`}
                            className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors"
                          >
                            {item.listing.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">(Listing removed)</span>
                        )}
                      </p>
                      <EnquiryStatusBadge status={item.status} />
                    </div>
                    {item.message && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground italic cursor-help">
                            &ldquo;{item.message}&rdquo;
                          </p>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-xs whitespace-pre-wrap text-xs leading-relaxed"
                        >
                          {item.message}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EnquiryStatusBadge({ status }: { status: BuyerEnquiryRow["status"] }) {
  const map: Record<
    BuyerEnquiryRow["status"],
    { label: string; className: string }
  > = {
    sent: {
      label: "Awaiting reply",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ring-1 ring-amber-500/20",
    },
    viewed: {
      label: "Viewed",
      className:
        "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 ring-1 ring-sky-500/20",
    },
    replied: {
      label: "Replied",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 ring-1 ring-emerald-500/20",
    },
    closed: {
      label: "Closed",
      className: "bg-muted text-muted-foreground ring-1 ring-border",
    },
  };
  const meta = map[status] ?? map.sent;
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full px-1.5 text-[10px] font-medium leading-none whitespace-nowrap",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

// ─── Sent to me section ────────────────────────────────────────────────────

function SentToMeSection({
  items,
  total,
}: {
  items: BuyerSentToMeRow[];
  total: number;
}) {
  const accent = ACCENTS.sent;
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        accent={accent}
        icon={<Send className="h-3 w-3" aria-hidden />}
        title="Sent to me"
        description="Listings a broker has shared with you directly."
        badge={<CountBadge value={total} />}
      />
      <Separator />
      <CardContent className="p-0">
        {items.length === 0 ? (
          <SectionEmpty
            accent={accent}
            icon={<Send className="h-5 w-5" />}
            title="Nothing sent to you yet"
            hint="When a broker shares a listing, it'll appear here so nothing gets lost in email."
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.invite_id} className="px-4 py-3 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <ListingThumb
                    url={item.listing?.cover_image_url ?? null}
                    alt={item.listing?.title ?? "Listing"}
                    seed={item.listing?.title ?? "?"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.listing?.title ?? "(Listing removed)"}
                      </p>
                      {item.opened_at ? (
                        <span className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 text-[10px] font-medium text-emerald-800 ring-1 ring-emerald-500/20 dark:bg-emerald-900/40 dark:text-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
                          Opened
                        </span>
                      ) : (
                        <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-violet-100 px-1.5 text-[10px] font-medium text-violet-800 ring-1 ring-violet-500/20 dark:bg-violet-900/40 dark:text-violet-200">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {item.broker_name ? `From ${item.broker_name}` : "From a broker"}
                      {item.listing?.location_text ? ` · ${item.listing.location_text}` : ""}
                    </p>
                    {item.custom_message && (
                      <p className="mt-1 line-clamp-2 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground italic">
                        &ldquo;{item.custom_message}&rdquo;
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <Button asChild size="sm" className="h-7 px-2 text-xs">
                        <Link href={`/invite/${item.token}`}>
                          Open invite
                          <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                        </Link>
                      </Button>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(item.sent_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── My alerts section ─────────────────────────────────────────────────────

function MyAlertsSection({
  alerts,
  setAlerts,
  categories,
}: {
  alerts: BuyerAlertPreference[];
  setAlerts: (next: BuyerAlertPreference[]) => void;
  categories: CategoryOption[];
}) {
  const accent = ACCENTS.alerts;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerAlertPreference | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<BuyerAlertPreference | null>(null);

  const activeCount = useMemo(() => alerts.filter((a) => a.is_active).length, [alerts]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(pref: BuyerAlertPreference) {
    setEditing(pref);
    setDialogOpen(true);
  }
  function handleSaved(next: BuyerAlertPreference) {
    if (editing) {
      setAlerts(alerts.map((a) => (a.id === next.id ? next : a)));
    } else {
      setAlerts([next, ...alerts]);
    }
  }

  function handleToggle(pref: BuyerAlertPreference, isActive: boolean) {
    setPendingTarget(pref.id);
    setAlerts(alerts.map((a) => (a.id === pref.id ? { ...a, is_active: isActive } : a)));
    startTransition(async () => {
      const res = await toggleAlertPreference(pref.id, isActive);
      setPendingTarget(null);
      if (!res.ok) {
        setAlerts(alerts);
        toast.error(res.error ?? "Could not update alert.");
      } else {
        toast.success(isActive ? "Alert resumed." : "Alert paused.", {
          duration: 1800,
        });
      }
    });
  }

  function handleDelete(pref: BuyerAlertPreference) {
    setPendingTarget(pref.id);
    startTransition(async () => {
      const res = await deleteAlertPreference(pref.id);
      setPendingTarget(null);
      if (res.ok) {
        setAlerts(alerts.filter((a) => a.id !== pref.id));
        toast.success("Alert deleted.");
        setConfirmDelete(null);
      } else {
        toast.error(res.error ?? "Could not delete alert.");
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <SectionHeader
        accent={accent}
        icon={<Sparkles className="h-3 w-3" aria-hidden />}
        title="My alerts"
        description="Get notified the moment a matching listing is published."
        badge={
          <Badge
            variant="secondary"
            className={cn(
              "ml-1 h-5 px-1.5 text-[11px] font-medium tabular-nums",
              activeCount > 0 && accent.bg,
              activeCount > 0 && accent.text,
            )}
          >
            {activeCount} active
          </Badge>
        }
        action={
          <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={openCreate}>
            <Plus className="h-3 w-3" aria-hidden />
            New
          </Button>
        }
      />
      <Separator />
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <SectionEmpty
            accent={accent}
            icon={<Bell className="h-5 w-5" />}
            title="Set it once, get matches forever"
            hint="Tell us what you're looking for and we'll email you when a matching listing is published."
            action={
              <Button size="sm" className="mt-3 gap-1" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Create your first alert
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((pref) => {
              const isPending = pendingTarget === pref.id;
              return (
                <li
                  key={pref.id}
                  className={cn(
                    "px-4 py-3 transition-all",
                    !pref.is_active && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
                        pref.is_active ? accent.bg : "bg-muted",
                        pref.is_active ? accent.ring : "ring-border",
                      )}
                    >
                      {pref.is_active ? (
                        <Bell className={cn("h-3.5 w-3.5", accent.text)} aria-hidden />
                      ) : (
                        <BellOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight truncate">
                          {pref.label?.trim() || "Listing alert"}
                        </p>
                        <Switch
                          aria-label={pref.is_active ? "Pause alert" : "Activate alert"}
                          checked={pref.is_active}
                          onCheckedChange={(v) => handleToggle(pref, v)}
                          disabled={isPending}
                        />
                      </div>
                      <PreferenceFilterChips pref={pref} />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {pref.is_active ? "Active" : "Paused"} · updated {compactDate(pref.updated_at)}
                        </span>
                        <div className="flex gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs gap-1"
                            onClick={() => openEdit(pref)}
                            disabled={isPending}
                          >
                            <PencilLine className="h-3 w-3" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete(pref)}
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="h-3 w-3" aria-hidden />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AlertPreferenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alert?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t get notifications for new listings matching these filters anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PreferenceFilterChips({ pref }: { pref: BuyerAlertPreference }) {
  const chips: { icon: React.ReactNode; label: string; tone: "neutral" | "category" | "location" | "price" }[] = [];
  if (pref.business_type) {
    chips.push({ icon: <Tag className="h-2.5 w-2.5" aria-hidden />, label: pref.business_type, tone: "category" });
  }
  if (pref.category_name) {
    chips.push({ icon: <Tag className="h-2.5 w-2.5" aria-hidden />, label: pref.category_name, tone: "category" });
  }
  const locationParts = [pref.suburb, pref.state].filter(Boolean).join(", ");
  if (locationParts) {
    chips.push({ icon: <MapPin className="h-2.5 w-2.5" aria-hidden />, label: locationParts, tone: "location" });
  }
  const priceLabel = formatPriceRange(pref.min_price, pref.max_price);
  if (priceLabel) {
    chips.push({ icon: null, label: priceLabel, tone: "price" });
  }
  if (chips.length === 0) {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground italic">Any new listing</p>
    );
  }
  const toneClass: Record<typeof chips[number]["tone"], string> = {
    neutral: "bg-muted text-muted-foreground",
    category:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    location:
      "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-1 ring-sky-500/20",
    price:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-500/20",
  };
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            toneClass[chip.tone],
          )}
        >
          {chip.icon}
          {chip.label}
        </span>
      ))}
    </div>
  );
}

// ─── Shared bits ───────────────────────────────────────────────────────────

function CountBadge({ value }: { value: number }) {
  return (
    <Badge
      variant="secondary"
      className="ml-1 h-5 px-1.5 text-[11px] font-medium tabular-nums"
    >
      {value}
    </Badge>
  );
}

function ListingThumb({
  url,
  alt,
  seed,
}: {
  url: string | null;
  alt: string;
  seed?: string | null;
}) {
  if (!url) {
    const initial = (seed?.trim()?.[0] ?? "?").toUpperCase();
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/60 text-sm font-semibold text-muted-foreground/70 ring-1 ring-border/60"
        aria-hidden
      >
        {initial}
      </div>
    );
  }
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 transition-transform group-hover:scale-[1.03]">
      <Image
        src={url}
        alt={alt}
        fill
        sizes="56px"
        className="object-cover"
      />
    </div>
  );
}

function PriceTag({
  amount,
  type,
}: {
  amount: number | null;
  type: "fixed" | "poa";
}) {
  const text = type === "poa"
    ? "POA"
    : amount == null
      ? "—"
      : new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(amount);
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
      {text}
    </span>
  );
}

function SectionEmpty({
  icon,
  title,
  hint,
  action,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action?: React.ReactNode;
  accent: SectionAccent;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full ring-1",
          accent.bg,
          accent.ring,
          accent.text,
        )}
        aria-hidden
      >
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-[14rem] text-[11px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
      {action}
    </div>
  );
}

function compactDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisYear(d)) return format(d, "d MMM");
  return format(d, "MMM yyyy");
}

function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${formatShort(min)}–${formatShort(max)}`;
  if (max != null) return `up to ${formatShort(max)}`;
  return `from ${formatShort(min!)}`;
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}
