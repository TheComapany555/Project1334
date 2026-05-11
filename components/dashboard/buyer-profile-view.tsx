"use client";

import {
  memo,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Copy,
  Check,
  UserPlus,
  Send,
  Eye,
  MessageSquare,
  ShieldCheck,
  ShieldQuestion,
  Heart,
  Phone as PhoneIcon,
  CalendarClock,
  ExternalLink,
  Activity as ActivityIcon,
  FileText,
  Filter,
  Search,
  Building2,
  Sparkles,
  Loader2,
  StickyNote,
  PhoneOutgoing,
  Inbox,
  AtSign,
  ClipboardList,
  TrendingUp,
  MessagesSquare,
  Share2,
  Clock,
  DollarSign,
  Target,
  MapPin,
  Tag as TagIcon,
  Download,
  FileSearch,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { addContact } from "@/lib/actions/contacts";
import type {
  BuyerActivityEvent,
  BuyerActivityKind,
  BuyerProfile,
  BuyerListingSummary,
  BuyerCrmStatus,
} from "@/lib/actions/buyer-profile";
import { TAG_COLOR_CLASSES } from "@/lib/types/contacts";

type Props = {
  profile: BuyerProfile;
};

// ─── Activity kind metadata ────────────────────────────────────────────────

const ACTIVITY_LABEL: Record<BuyerActivityKind, string> = {
  view: "Viewed listing",
  enquiry: "Sent enquiry",
  save: "Saved listing",
  nda_signed: "Signed NDA",
  nda_requested: "Requested document access",
  document_approved: "Document access approved",
  document_viewed: "Viewed document",
  document_downloaded: "Downloaded document",
  call: "Clicked call button",
  email_sent: "Email sent",
  email_received: "Email received",
  call_logged: "Call logged",
  note_added: "Note added",
  follow_up_set: "Follow-up scheduled",
  follow_up_completed: "Follow-up completed",
  status_changed: "Status changed",
  listing_shared: "Listing shared",
  message_sent: "Message sent",
  message_received: "Message received",
  feedback_logged: "Feedback logged",
};

const ACTIVITY_ICON: Record<BuyerActivityKind, React.ComponentType<{ className?: string }>> = {
  view: Eye,
  enquiry: MessageSquare,
  save: Heart,
  nda_signed: ShieldCheck,
  nda_requested: ShieldQuestion,
  document_approved: FileText,
  document_viewed: FileSearch,
  document_downloaded: Download,
  call: PhoneIcon,
  email_sent: AtSign,
  email_received: Inbox,
  call_logged: PhoneOutgoing,
  note_added: StickyNote,
  follow_up_set: CalendarClock,
  follow_up_completed: Check,
  status_changed: TrendingUp,
  listing_shared: Share2,
  message_sent: MessagesSquare,
  message_received: MessagesSquare,
  feedback_logged: ClipboardList,
};

const ACTIVITY_TONE: Record<BuyerActivityKind, string> = {
  view: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  enquiry: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  save: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  nda_signed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  nda_requested:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  document_approved:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  document_viewed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  document_downloaded:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  call: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  email_sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  email_received: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  call_logged:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  note_added:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  follow_up_set:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  follow_up_completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  status_changed:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  listing_shared:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  message_sent: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  message_received: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  feedback_logged:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
};

const ACTIVITY_FILTERS: { value: BuyerActivityKind; label: string }[] = [
  { value: "view", label: "Views" },
  { value: "enquiry", label: "Enquiries" },
  { value: "save", label: "Saves" },
  { value: "nda_signed", label: "NDA signed" },
  { value: "nda_requested", label: "NDA requested" },
  { value: "document_approved", label: "Docs viewed" },
  { value: "call", label: "Calls" },
  { value: "email_sent", label: "Emails sent" },
  { value: "email_received", label: "Emails received" },
  { value: "call_logged", label: "Calls logged" },
  { value: "note_added", label: "Notes" },
  { value: "follow_up_set", label: "Follow-ups" },
  { value: "follow_up_completed", label: "Follow-ups done" },
  { value: "status_changed", label: "Status changes" },
  { value: "listing_shared", label: "Listings shared" },
  { value: "message_sent", label: "Messages sent" },
  { value: "message_received", label: "Messages received" },
  { value: "feedback_logged", label: "Feedback" },
];

// ─── Main view ─────────────────────────────────────────────────────────────

export function BuyerProfileView({ profile }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const router = useRouter();
  const [savingContact, startSaveTransition] = useTransition();

  const engagementScore = useMemo(
    () => computeEngagementScore(profile),
    [profile],
  );

  const handleSaveContact = useCallback(() => {
    if (profile.in_contacts) {
      toast.info("Already in your contacts.");
      return;
    }
    startSaveTransition(async () => {
      const res = await addContact({
        name: profile.name ?? "",
        email: profile.email,
        phone: profile.phone ?? "",
        company: "",
        interest: "",
        notes: profile.scope_listing
          ? `Saved from buyer profile. Engaged with: ${profile.scope_listing.title}`
          : "Saved from buyer profile",
        consent_marketing: false,
        tag_ids: [],
      });
      if (res.ok) {
        toast.success("Saved to your contacts.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Couldn't save contact.");
      }
    });
  }, [profile, router]);

  const variants: Variants = reducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.22, ease: "easeOut" },
        },
      };

  const containerVariants: Variants = reducedMotion
    ? { hidden: {}, visible: {} }
    : { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

  return (
    <TooltipProvider delayDuration={150}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <BackLink scopeListing={profile.scope_listing} />

        <motion.div variants={variants}>
          <BuyerHeroCard
            profile={profile}
            onSaveContact={handleSaveContact}
            saving={savingContact}
            engagementScore={engagementScore}
          />
        </motion.div>

        <motion.div variants={variants}>
          <KpiStrip profile={profile} />
        </motion.div>

        <motion.div variants={variants}>
          <CrmDetailsCard profile={profile} />
        </motion.div>

        <motion.div variants={variants}>
          <BuyerTabs profile={profile} />
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}

// ─── Back link ─────────────────────────────────────────────────────────────

function BackLink({
  scopeListing,
}: {
  scopeListing: BuyerProfile["scope_listing"];
}) {
  const href = scopeListing
    ? `/dashboard/listings/${scopeListing.id}/insights`
    : "/dashboard/contacts";
  const label = scopeListing
    ? `Back to ${scopeListing.title} insights`
    : "Back to contacts";
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}

// ─── Hero card ─────────────────────────────────────────────────────────────

function BuyerHeroCard({
  profile,
  onSaveContact,
  saving,
  engagementScore,
}: {
  profile: BuyerProfile;
  onSaveContact: () => void;
  saving: boolean;
  engagementScore: { label: string; tone: string };
}) {
  const initials = useMemo(
    () => getInitials(profile.name, profile.email),
    [profile.name, profile.email],
  );
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card className="overflow-hidden border-primary/10">
      <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-background h-20" />
      <CardContent className="-mt-12 px-6 pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4 min-w-0">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-md shrink-0">
              {profile.photo_url ? (
                <AvatarImage src={profile.photo_url} alt={profile.name ?? profile.email} />
              ) : null}
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl truncate">
                  {profile.name?.trim() || "Anonymous buyer"}
                </h1>
                <Badge
                  variant="secondary"
                  className={cn("font-medium text-[11px]", engagementScore.tone)}
                >
                  <Sparkles className="h-3 w-3 mr-1" aria-hidden />
                  {engagementScore.label}
                </Badge>
                {profile.in_contacts && (
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <Check className="h-3 w-3" aria-hidden />
                    In contacts
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Buyer · {memberSince ? `Member since ${memberSince}` : "Member"}
                {profile.scope_listing && (
                  <>
                    {" · Viewed in context of "}
                    <Link
                      href={`/dashboard/listings/${profile.scope_listing.id}/insights`}
                      className="text-foreground hover:underline"
                    >
                      {profile.scope_listing.title}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Contact rail */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5 min-w-0">
            <ContactPill
              icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
              value={profile.email}
              href={`mailto:${profile.email}`}
              copyable
            />
            {profile.phone && (
              <ContactPill
                icon={<Phone className="h-3.5 w-3.5" aria-hidden />}
                value={profile.phone}
                href={`tel:${profile.phone.replace(/\s+/g, "")}`}
                copyable
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 cursor-pointer"
              onClick={onSaveContact}
              disabled={saving || profile.in_contacts}
              aria-label={
                profile.in_contacts ? "Already in contacts" : "Save to contacts"
              }
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : profile.in_contacts ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
              )}
              {profile.in_contacts ? "In contacts" : "Save to contacts"}
            </Button>
            <Button
              size="sm"
              asChild
              className="gap-1.5 cursor-pointer"
            >
              <a href={`mailto:${profile.email}`}>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Email buyer
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactPill({
  icon,
  value,
  href,
  copyable,
}: {
  icon: React.ReactNode;
  value: string;
  href: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy.");
    }
  }, [value]);

  return (
    <div className="inline-flex items-center gap-1.5 text-sm min-w-0">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <a
        href={href}
        className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm truncate"
      >
        {value}
      </a>
      {copyable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copy ${value}`}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-3 w-3" aria-hidden />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ─── KPI strip ─────────────────────────────────────────────────────────────

const KpiStrip = memo(function KpiStrip({ profile }: { profile: BuyerProfile }) {
  const m = profile.metrics;
  const items: { icon: React.ReactNode; label: string; value: string; accent: string; hint: string }[] = [
    {
      icon: <Building2 className="h-4 w-4" />,
      label: "Listings",
      value: m.listings_touched.toLocaleString("en-AU"),
      accent: "#0ea5e9",
      hint: "Number of your listings this buyer has interacted with.",
    },
    {
      icon: <Eye className="h-4 w-4" />,
      label: "Total Views",
      value: m.total_views.toLocaleString("en-AU"),
      accent: "#008F2F",
      hint: "Every page load by this buyer across your listings.",
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Enquiries",
      value: m.total_enquiries.toLocaleString("en-AU"),
      accent: "#f59e0b",
      hint: "Enquiry forms this buyer has submitted to you.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "NDAs Signed",
      value: m.nda_signed.toLocaleString("en-AU"),
      accent: "#8b5cf6",
      hint: "Non-disclosure agreements this buyer has completed.",
    },
    {
      icon: <Heart className="h-4 w-4" />,
      label: "Saves",
      value: m.saves.toLocaleString("en-AU"),
      accent: "#ec4899",
      hint: "Listings this buyer has bookmarked.",
    },
    {
      icon: <CalendarClock className="h-4 w-4" />,
      label: "Last Seen",
      value: m.last_seen_at ? fmtRelative(new Date(m.last_seen_at)) : "—",
      accent: "#6366f1",
      hint: m.last_seen_at
        ? new Date(m.last_seen_at).toLocaleString("en-AU")
        : "No tracked activity yet.",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <Tooltip key={item.label}>
          <TooltipTrigger asChild>
            <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md cursor-help">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ background: `${item.accent}18`, color: item.accent }}
                    aria-hidden
                  >
                    {item.icon}
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
                    {item.label}
                  </p>
                </div>
                <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {item.hint}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
});

// ─── CRM details card (M1.1 + M1.2 fields) ────────────────────────────────

const CRM_STATUS_LABEL: Record<BuyerCrmStatus, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  interested: "Interested",
  meeting_scheduled: "Meeting scheduled",
  nda_signed: "NDA Signed",
  documents_shared: "Documents shared",
  negotiating: "Negotiating",
  closed: "Closed",
};

const CRM_STATUS_TONE: Record<BuyerCrmStatus, string> = {
  new_lead: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  contacted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  interested: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  meeting_scheduled: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  nda_signed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  documents_shared: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  negotiating: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const FUNDING_LABEL: Record<string, string> = {
  self_funded: "Self-funded",
  pre_approved: "Pre-approved",
  seeking_finance: "Seeking finance",
  unspecified: "Unspecified",
};

const TIMEFRAME_LABEL: Record<string, string> = {
  lt_3m: "Within 3 months",
  "3_6m": "3–6 months",
  "6_12m": "6–12 months",
  gt_12m: "More than 12 months",
  unspecified: "Unspecified",
};

function fmtBudget(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `from ${fmt(min)}`;
  return `up to ${fmt(max!)}`;
}

function fmtAbsDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CrmDetailsCard({ profile }: { profile: BuyerProfile }) {
  const p = profile.preferences;
  const crm = profile.crm;
  const status = crm.status;

  const hasPreferences =
    p.budget_min != null ||
    p.budget_max != null ||
    p.preferred_industries.length > 0 ||
    p.preferred_locations.length > 0 ||
    p.funding_status != null ||
    p.timeframe != null ||
    !!p.location_text;

  const hasCrmRow = !!crm.contact_id;
  const hasNotesOrInterest = !!crm.notes || !!crm.interest;
  const hasTags = crm.tags.length > 0;

  const overdue =
    crm.next_follow_up_at &&
    new Date(crm.next_follow_up_at).getTime() < Date.now();

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              CRM &amp; preferences
            </CardTitle>
            <CardDescription>
              What this buyer is looking for, and your relationship history.
            </CardDescription>
          </div>
          {status && (
            <Badge
              variant="outline"
              className={cn("text-[11px]", CRM_STATUS_TONE[status])}
            >
              {CRM_STATUS_LABEL[status]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* Snapshot grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <SnapshotItem
            label="Last contacted"
            value={fmtAbsDate(crm.last_contacted_at)}
          />
          <SnapshotItem
            label="Last emailed"
            value={fmtAbsDate(crm.last_emailed_at)}
          />
          <SnapshotItem
            label="Last called"
            value={fmtAbsDate(crm.last_called_at)}
          />
          <SnapshotItem
            label="First interaction"
            value={fmtAbsDate(crm.first_interaction_at)}
          />
          <SnapshotItem
            label="Next follow-up"
            value={fmtAbsDate(crm.next_follow_up_at)}
            tone={overdue ? "warn" : "default"}
          />
          <SnapshotItem
            label="Last active"
            value={fmtAbsDate(profile.last_active_at)}
          />
          <SnapshotItem
            label="Account created"
            value={fmtAbsDate(profile.created_at)}
          />
          <SnapshotItem
            label="In your CRM"
            value={hasCrmRow ? "Yes" : "Not yet"}
          />
        </div>

        {/* Buyer details */}
        {hasPreferences && (
          <>
            <Separator />
            <div>
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-3">
                What they're looking for
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <DetailRow
                  icon={DollarSign}
                  label="Budget"
                  value={fmtBudget(p.budget_min, p.budget_max)}
                />
                <DetailRow
                  icon={CalendarClock}
                  label="Timeframe"
                  value={p.timeframe ? TIMEFRAME_LABEL[p.timeframe] : null}
                />
                <DetailRow
                  icon={DollarSign}
                  label="Funding"
                  value={
                    p.funding_status ? FUNDING_LABEL[p.funding_status] : null
                  }
                />
                <DetailRow
                  icon={MapPin}
                  label="Based in"
                  value={p.location_text}
                />
                {p.preferred_industries.length > 0 && (
                  <DetailRow
                    icon={Building2}
                    label="Industries"
                    value={p.preferred_industries.join(", ")}
                  />
                )}
                {p.preferred_locations.length > 0 && (
                  <DetailRow
                    icon={MapPin}
                    label="Locations"
                    value={p.preferred_locations.join(", ")}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* CRM record */}
        {(hasTags || hasNotesOrInterest) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                CRM record
              </h3>
              {hasTags && (
                <div className="flex items-start gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {crm.tags.map((t) => (
                      <Badge
                        key={t.id}
                        variant="outline"
                        className={cn("text-[10px]", TAG_COLOR_CLASSES[t.color])}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {crm.interest && (
                <DetailRow
                  icon={Target}
                  label="Interest"
                  value={crm.interest}
                />
              )}
              {crm.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {crm.notes}
                </div>
              )}
            </div>
          </>
        )}

        {!hasPreferences && !hasCrmRow && (
          <p className="text-xs text-muted-foreground italic">
            This buyer hasn't filled in preferences yet, and they're not in
            your CRM. Use the slide-out from the CRM page to add them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | null;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2",
        tone === "warn" &&
          "border-orange-300 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30",
      )}
    >
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        {label}
      </div>
      <p className="font-medium mt-0.5 text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function BuyerTabs({ profile }: { profile: BuyerProfile }) {
  return (
    <Tabs defaultValue="activity" className="space-y-4">
      <TabsList>
        <TabsTrigger value="activity" className="gap-1.5">
          <ActivityIcon className="h-3.5 w-3.5" aria-hidden />
          Activity
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
            {profile.activity.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="listings" className="gap-1.5">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Listings
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
            {profile.listings.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="enquiries" className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Enquiries
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
            {profile.enquiries.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="activity">
        <ActivityTab activity={profile.activity} listings={profile.listings} />
      </TabsContent>

      <TabsContent value="listings">
        <ListingsTab listings={profile.listings} />
      </TabsContent>

      <TabsContent value="enquiries">
        <EnquiriesTab enquiries={profile.enquiries} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Activity tab ──────────────────────────────────────────────────────────

const ActivityTab = memo(function ActivityTab({
  activity,
  listings,
}: {
  activity: BuyerActivityEvent[];
  listings: BuyerListingSummary[];
}) {
  const [activeKinds, setActiveKinds] = useState<BuyerActivityKind[]>([]);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const [deferredSearch, setDeferredSearch] = useState("");

  const counts = useMemo(() => {
    const c: Partial<Record<BuyerActivityKind, number>> = {};
    for (const a of activity) c[a.kind] = (c[a.kind] ?? 0) + 1;
    return c;
  }, [activity]);

  const titleByListing = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of listings) m.set(l.listing_id, l.title);
    return m;
  }, [listings]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return activity.filter((a) => {
      if (activeKinds.length > 0 && !activeKinds.includes(a.kind)) return false;
      if (!q) return true;
      const title = titleByListing.get(a.listing_id) ?? "";
      const hay = `${title} ${ACTIVITY_LABEL[a.kind]} ${a.detail ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activity, activeKinds, deferredSearch, titleByListing]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    startTransition(() => setDeferredSearch(value));
  }, []);

  // Group by date for nicer visual hierarchy
  const grouped = useMemo(() => {
    const map = new Map<string, BuyerActivityEvent[]>();
    for (const a of filtered) {
      const day = a.at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">Activity timeline</CardTitle>
          <CardDescription className="text-xs">
            Every interaction this buyer has had with your listings, newest first.
          </CardDescription>
        </div>

        {activity.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by listing or activity"
                aria-label="Search activity"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Filter className="h-3 w-3" aria-hidden />
                Filter
              </span>
              <ToggleGroup
                type="multiple"
                value={activeKinds}
                onValueChange={(v) => setActiveKinds(v as BuyerActivityKind[])}
                aria-label="Filter activity by type"
                className="flex flex-wrap gap-1.5"
              >
                {ACTIVITY_FILTERS.map((f) => {
                  const count = counts[f.value] ?? 0;
                  const disabled = count === 0;
                  return (
                    <ToggleGroupItem
                      key={f.value}
                      value={f.value}
                      disabled={disabled}
                      aria-label={`${f.label} (${count})`}
                      className={cn(
                        "h-7 px-2.5 text-[11px] rounded-full border data-[state=on]:border-transparent cursor-pointer",
                        ACTIVITY_ACTIVE_CLASSES[f.value],
                      )}
                    >
                      {f.label}
                      <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
              {(activeKinds.length > 0 || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveKinds([]);
                    handleSearch("");
                  }}
                  className="h-7 text-[11px] px-2 cursor-pointer"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {activity.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="h-4 w-4" />}
            title="No activity yet"
            description="When this buyer views, enquires, or signs an NDA on your listings, it'll appear here."
          />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<Filter className="h-4 w-4" />}
            title="No activity matches your filters"
            description="Try clearing filters or searching a different listing."
          />
        ) : (
          <ol className="space-y-6 max-h-[600px] overflow-y-auto -mx-1 px-1">
            {grouped.map(([day, events]) => (
              <li key={day}>
                <div className="sticky top-0 z-10 -mx-3 px-3 py-1.5 bg-background/95 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {fmtDateGroup(day)}
                  </p>
                </div>
                <ul className="mt-2 space-y-2.5">
                  {events.map((event) => (
                    <ActivityItem
                      key={event.id}
                      event={event}
                      listingTitle={titleByListing.get(event.listing_id) ?? "Listing"}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
});

const ActivityItem = memo(function ActivityItem({
  event,
  listingTitle,
}: {
  event: BuyerActivityEvent;
  listingTitle: string;
}) {
  const Icon = ACTIVITY_ICON[event.kind];
  return (
    <li className="flex items-start gap-3 group rounded-md transition-colors duration-150 hover:bg-muted/40 -mx-2 px-2 py-1.5">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          ACTIVITY_TONE[event.kind],
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-medium">{ACTIVITY_LABEL[event.kind]}</p>
          <span className="text-[11px] text-muted-foreground">
            {fmtTime(event.at)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          <Link
            href={`/dashboard/listings/${event.listing_id}/insights`}
            className="hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {listingTitle}
          </Link>
          {event.detail && <span className="ml-1.5">· {event.detail}</span>}
        </p>
      </div>
    </li>
  );
});

// ─── Listings tab ──────────────────────────────────────────────────────────

const ListingsTab = memo(function ListingsTab({
  listings,
}: {
  listings: BuyerListingSummary[];
}) {
  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<Building2 className="h-4 w-4" />}
            title="No listings touched"
            description="This buyer hasn't engaged with any of your listings yet."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Per-listing engagement
        </CardTitle>
        <CardDescription className="text-xs">
          Stats are scoped to this buyer only.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left">
                <th className="pl-5 pr-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Listing
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Views
                </th>
                <th
                  className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell"
                  title="Distinct days the buyer came back after their first visit"
                >
                  Returns
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  Enquiries
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Calls
                </th>
                <th
                  className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell"
                  title="Document opens / downloads"
                >
                  Docs (view/dl)
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Signals
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Last activity
                </th>
                <th className="pr-5 pl-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((l) => (
                <tr
                  key={l.listing_id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="pl-5 pr-3 py-3">
                    <Link
                      href={`/dashboard/listings/${l.listing_id}/insights`}
                      className="text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm truncate inline-block max-w-[220px] align-middle"
                    >
                      {l.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-sm tabular-nums">{l.views}</td>
                  <td className="px-3 py-3 text-sm tabular-nums hidden sm:table-cell">
                    {l.return_visits}
                  </td>
                  <td className="px-3 py-3 text-sm tabular-nums hidden sm:table-cell">
                    {l.enquiries}
                  </td>
                  <td className="px-3 py-3 text-sm tabular-nums hidden md:table-cell">
                    {l.calls}
                  </td>
                  <td className="px-3 py-3 text-sm tabular-nums hidden lg:table-cell">
                    {l.documents_viewed}
                    {l.documents_downloaded > 0 && (
                      <span className="text-muted-foreground">
                        {" / "}
                        {l.documents_downloaded}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.nda_signed && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0"
                        >
                          <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                          NDA
                        </Badge>
                      )}
                      {l.nda_requested && !l.nda_signed && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0"
                        >
                          <ShieldQuestion className="h-2.5 w-2.5" aria-hidden />
                          NDA req
                        </Badge>
                      )}
                      {l.saved && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-0"
                        >
                          <Heart className="h-2.5 w-2.5" aria-hidden />
                          Saved
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {l.last_activity_at
                      ? fmtRelative(new Date(l.last_activity_at))
                      : "—"}
                  </td>
                  <td className="pr-5 pl-3 py-3 text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                    >
                      <Link
                        href={`/listing/${l.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Enquiries tab ─────────────────────────────────────────────────────────

const EnquiriesTab = memo(function EnquiriesTab({
  enquiries,
}: {
  enquiries: BuyerProfile["enquiries"];
}) {
  if (enquiries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<MessageSquare className="h-4 w-4" />}
            title="No enquiries yet"
            description="Buyer-submitted enquiries from your listings will appear here."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {enquiries.map((e) => (
        <Card key={e.id}>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/dashboard/listings/${e.listing_id}/insights`}
                className="text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {e.listing_title}
              </Link>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fmtTime(e.created_at)} · {fmtRelative(new Date(e.created_at))}
                {e.reason && ` · ${e.reason}`}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
              <a href={`mailto:${e.contact_email}?subject=Re: ${encodeURIComponent(e.listing_title)}`}>
                <Mail className="h-3 w-3 mr-1" aria-hidden />
                Reply
              </a>
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3">
            <p className="text-sm whitespace-pre-wrap text-foreground">
              {e.message}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-10">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ACTIVITY_ACTIVE_CLASSES: Record<BuyerActivityKind, string> = {
  view: "data-[state=on]:bg-sky-100 data-[state=on]:text-sky-700 dark:data-[state=on]:bg-sky-900/40 dark:data-[state=on]:text-sky-300",
  enquiry:
    "data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-900/40 dark:data-[state=on]:text-amber-300",
  save: "data-[state=on]:bg-pink-100 data-[state=on]:text-pink-700 dark:data-[state=on]:bg-pink-900/40 dark:data-[state=on]:text-pink-300",
  nda_signed:
    "data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 dark:data-[state=on]:bg-emerald-900/40 dark:data-[state=on]:text-emerald-300",
  nda_requested:
    "data-[state=on]:bg-violet-100 data-[state=on]:text-violet-700 dark:data-[state=on]:bg-violet-900/40 dark:data-[state=on]:text-violet-300",
  document_approved:
    "data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 dark:data-[state=on]:bg-indigo-900/40 dark:data-[state=on]:text-indigo-300",
  document_viewed:
    "data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 dark:data-[state=on]:bg-indigo-900/40 dark:data-[state=on]:text-indigo-300",
  document_downloaded:
    "data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 dark:data-[state=on]:bg-indigo-900/40 dark:data-[state=on]:text-indigo-300",
  call: "data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 dark:data-[state=on]:bg-emerald-900/40 dark:data-[state=on]:text-emerald-300",
  email_sent:
    "data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 dark:data-[state=on]:bg-blue-900/40 dark:data-[state=on]:text-blue-300",
  email_received:
    "data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 dark:data-[state=on]:bg-blue-900/40 dark:data-[state=on]:text-blue-300",
  call_logged:
    "data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 dark:data-[state=on]:bg-emerald-900/40 dark:data-[state=on]:text-emerald-300",
  note_added:
    "data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-900/40 dark:data-[state=on]:text-amber-300",
  follow_up_set:
    "data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/40 dark:data-[state=on]:text-orange-300",
  follow_up_completed:
    "data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 dark:data-[state=on]:bg-emerald-900/40 dark:data-[state=on]:text-emerald-300",
  status_changed:
    "data-[state=on]:bg-slate-100 data-[state=on]:text-slate-700 dark:data-[state=on]:bg-slate-900/40 dark:data-[state=on]:text-slate-300",
  listing_shared:
    "data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 dark:data-[state=on]:bg-indigo-900/40 dark:data-[state=on]:text-indigo-300",
  message_sent:
    "data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700 dark:data-[state=on]:bg-cyan-900/40 dark:data-[state=on]:text-cyan-300",
  message_received:
    "data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700 dark:data-[state=on]:bg-cyan-900/40 dark:data-[state=on]:text-cyan-300",
  feedback_logged:
    "data-[state=on]:bg-fuchsia-100 data-[state=on]:text-fuchsia-700 dark:data-[state=on]:bg-fuchsia-900/40 dark:data-[state=on]:text-fuchsia-300",
};

function getInitials(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (
      ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase() || "?"
    );
  }
  return source[0]?.toUpperCase() ?? "?";
}

function computeEngagementScore(
  profile: BuyerProfile,
): { label: string; tone: string } {
  const m = profile.metrics;
  let score = 0;
  score += Math.min(m.total_views, 10) * 1;
  score += Math.min(m.total_return_visits, 10) * 2; // returning = strong signal
  score += m.total_enquiries * 8;
  score += m.saves * 4;
  score += m.nda_requested * 6;
  score += m.nda_signed * 12;
  score += m.total_calls * 5;
  score += m.documents_viewed * 4;
  score += m.documents_downloaded * 6; // downloads outweigh views — buyer kept the file

  if (score >= 30)
    return {
      label: "Hot lead",
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  if (score >= 12)
    return {
      label: "Warm",
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  return {
    label: "New interest",
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  };
}

function fmtRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDateGroup(day: string): string {
  const d = new Date(day + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
