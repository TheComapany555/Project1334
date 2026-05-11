"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmailComposer } from "@/components/dashboard/email-composer";
import { CallLogDialog } from "@/components/dashboard/call-log-dialog";
import { AddNoteDialog } from "@/components/dashboard/add-note-dialog";
import { FollowUpDialog } from "@/components/dashboard/follow-up-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setContactStatus } from "@/lib/actions/crm";
import { startThreadFromContact } from "@/lib/actions/messages";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Mail,
  Phone,
  CalendarClock,
  Clock,
  TrendingUp,
  Eye,
  MessageSquare,
  Heart,
  ShieldCheck,
  ShieldQuestion,
  FileText,
  StickyNote,
  Send,
  PhoneCall,
  ClipboardList,
  Building2,
  DollarSign,
  Target,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASSES } from "@/lib/types/contacts";
import {
  getBuyerProfile,
  getBuyerPanelByContactId,
  type BuyerProfile,
  type BuyerActivityEvent,
  type BuyerActivityKind,
  type BuyerCrmStatus,
} from "@/lib/actions/buyer-profile";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";

// ── Status pill colors (broker-CRM status) ────────────────────────────────

const STATUS_LABEL: Record<BuyerCrmStatus, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  interested: "Interested",
  meeting_scheduled: "Meeting scheduled",
  nda_signed: "NDA Signed",
  documents_shared: "Documents shared",
  negotiating: "Negotiating",
  closed: "Closed",
};

const STATUS_TONE: Record<BuyerCrmStatus, string> = {
  new_lead: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  contacted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  interested:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  meeting_scheduled:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  nda_signed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  documents_shared:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  negotiating:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

// ── Activity icons (compact) ──────────────────────────────────────────────

const ACTIVITY_ICON: Record<
  BuyerActivityKind,
  React.ComponentType<{ className?: string }>
> = {
  view: Eye,
  enquiry: MessageSquare,
  save: Heart,
  nda_signed: ShieldCheck,
  nda_requested: ShieldQuestion,
  document_approved: FileText,
  document_viewed: FileText,
  document_downloaded: FileText,
  call: Phone,
  email_sent: Mail,
  email_received: Mail,
  call_logged: PhoneCall,
  note_added: StickyNote,
  follow_up_set: CalendarClock,
  follow_up_completed: CalendarClock,
  status_changed: TrendingUp,
  listing_shared: Send,
  message_sent: MessageSquare,
  message_received: MessageSquare,
  feedback_logged: ClipboardList,
};

const ACTIVITY_LABEL: Record<BuyerActivityKind, string> = {
  view: "Viewed listing",
  enquiry: "Sent enquiry",
  save: "Saved listing",
  nda_signed: "Signed NDA",
  nda_requested: "Requested document access",
  document_approved: "Document access approved",
  document_viewed: "Viewed document",
  document_downloaded: "Downloaded document",
  call: "Tapped call",
  email_sent: "Email sent",
  email_received: "Email received",
  call_logged: "Call logged",
  note_added: "Note",
  follow_up_set: "Follow-up scheduled",
  follow_up_completed: "Follow-up completed",
  status_changed: "Status changed",
  listing_shared: "Listing shared",
  message_sent: "Message sent",
  message_received: "Message received",
  feedback_logged: "Feedback",
};

// ── Component ─────────────────────────────────────────────────────────────

export function BuyerProfilePanelMount() {
  const { open, target, refreshNonce, close } = useBuyerPanelStore();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 overflow-y-auto"
      >
        {target ? (
          <PanelBody
            key={`${target.kind}-${
              target.kind === "buyer" ? target.buyerUserId : target.contactId
            }-${refreshNonce}`}
            target={target}
            onClose={close}
          />
        ) : (
          <div className="p-6">
            <SheetHeader>
              <SheetTitle className="sr-only">Buyer profile</SheetTitle>
              <SheetDescription className="sr-only">
                No buyer selected.
              </SheetDescription>
            </SheetHeader>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  target,
  onClose,
}: {
  target: NonNullable<ReturnType<typeof useBuyerPanelStore.getState>["target"]>;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey:
      target.kind === "buyer"
        ? ["buyer-panel", "buyer", target.buyerUserId, target.listingId ?? null]
        : ["buyer-panel", "contact", target.contactId],
    queryFn: () =>
      target.kind === "buyer"
        ? getBuyerProfile(target.buyerUserId, {
            listingId: target.listingId ?? null,
          })
        : getBuyerPanelByContactId(target.contactId),
    staleTime: 30_000,
  });

  // Toggle body scroll lock is handled by Radix Dialog in <Sheet>; we just
  // close on Esc which Sheet already wires up.
  useEffect(() => {
    return () => {};
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SheetHeader className="p-0 space-y-2">
          <SheetTitle className="sr-only">Loading buyer profile</SheetTitle>
          <SheetDescription className="sr-only">
            Fetching buyer details.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Couldn’t load buyer</SheetTitle>
          <SheetDescription>
            {error instanceof Error ? error.message : "Please try again."}
          </SheetDescription>
        </SheetHeader>
        <Button onClick={onClose} variant="outline" className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  return <BuyerPanelContent profile={data} target={target} />;
}

function BuyerPanelContent({
  profile,
  target,
}: {
  profile: BuyerProfile;
  target: NonNullable<ReturnType<typeof useBuyerPanelStore.getState>["target"]>;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [composerOpen, setComposerOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const closePanel = useBuyerPanelStore((s) => s.close);
  const isLite = target.kind === "contact" && !profile.crm.contact_id;
  const status = profile.crm.status;
  const buyerUserIdForActions =
    target.kind === "buyer" ? target.buyerUserId : null;
  const refreshPanel = () =>
    queryClient.invalidateQueries({ queryKey: ["buyer-panel"] });
  const fullProfileHref = `/dashboard/buyers/${
    target.kind === "buyer" ? target.buyerUserId : profile.id
  }${
    target.kind === "buyer" && target.listingId
      ? `?listingId=${encodeURIComponent(target.listingId)}`
      : ""
  }`;

  const canActOnCrm = !!profile.crm.contact_id || !!buyerUserIdForActions;
  const handleEmailClick = () => {
    if (!profile.crm.contact_id) {
      toast.error(
        "Add this buyer to your CRM first (use the row's “…” menu) to email them.",
      );
      return;
    }
    setComposerOpen(true);
  };
  const handleCallClick = () => {
    if (!canActOnCrm) {
      toast.error("Couldn't log — contact missing");
      return;
    }
    setCallOpen(true);
  };
  const handleNoteClick = () => {
    if (!canActOnCrm) {
      toast.error("Couldn't save — contact missing");
      return;
    }
    setNoteOpen(true);
  };
  const handleFollowUpClick = () => {
    if (!canActOnCrm) {
      toast.error("Couldn't schedule — contact missing");
      return;
    }
    setFollowUpOpen(true);
  };

  const handleStatusChange = async (next: string) => {
    if (!profile.crm.contact_id) return;
    const res = await setContactStatus(
      profile.crm.contact_id,
      next as BuyerCrmStatus,
    );
    if (res.ok) {
      toast.success("Status updated");
      refreshPanel();
    } else {
      toast.error(res.error);
    }
  };

  const handleMessageClick = async () => {
    if (!profile.crm.contact_id) {
      toast.error(
        "Add this buyer to your CRM first to start a chat.",
      );
      return;
    }
    if (!buyerUserIdForActions) {
      toast.error(
        "This contact doesn't have a Salebiz account yet — can't message them.",
      );
      return;
    }
    const res = await startThreadFromContact(
      profile.crm.contact_id,
      scopeListingId ?? null,
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    closePanel();
    router.push(`/dashboard/messages?thread=${res.threadId}`);
  };
  const scopeListingId =
    target.kind === "buyer" ? target.listingId ?? null : null;
  const scopeListingTitle =
    profile.scope_listing?.title ??
    profile.listings.find((l) => l.listing_id === scopeListingId)?.title ??
    null;

  return (
    <div className="flex flex-col">
      <div className="px-6 py-5 border-b">
        <SheetHeader className="p-0 space-y-2">
          <SheetTitle className="text-base">Buyer profile</SheetTitle>
          <SheetDescription className="sr-only">
            CRM details, activity, and quick actions for this buyer.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-start gap-3 mt-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile.photo_url ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(profile.name, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">
              {profile.name || profile.email}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <a
                href={`mailto:${encodeURIComponent(profile.email)}`}
                className="flex items-center gap-1 truncate text-primary hover:underline underline-offset-2"
              >
                <Mail className="h-3 w-3" />
                {profile.email}
              </a>
              {profile.phone && (
                <a
                  href={`tel:${profile.phone.replace(/\s+/g, "").replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-1 text-primary hover:underline underline-offset-2"
                >
                  <Phone className="h-3 w-3" />
                  {profile.phone}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile.crm.contact_id ? (
                <Select
                  value={status ?? "new_lead"}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger
                    size="sm"
                    className={cn(
                      "h-7 text-[11px] gap-1 px-2 font-medium border",
                      STATUS_TONE[status ?? "new_lead"],
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "new_lead",
                        "contacted",
                        "interested",
                        "meeting_scheduled",
                        "nda_signed",
                        "documents_shared",
                        "negotiating",
                        "closed",
                      ] as BuyerCrmStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                status && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", STATUS_TONE[status])}
                  >
                    {STATUS_LABEL[status]}
                  </Badge>
                )
              )}
              {profile.crm.consent_marketing && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-300"
                >
                  Consent given
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="mt-4 gap-1.5">
          <Link href={fullProfileHref}>
            <ExternalLink className="h-3.5 w-3.5" />
            View full profile
          </Link>
        </Button>
      </div>

      {/* Quick actions row */}
      <div className="px-6 py-3 border-b grid grid-cols-5 gap-2">
        <QuickAction icon={Mail} label="Email" onClick={handleEmailClick} />
        <QuickAction icon={PhoneCall} label="Call" onClick={handleCallClick} />
        <QuickAction icon={StickyNote} label="Note" onClick={handleNoteClick} />
        <QuickAction
          icon={CalendarClock}
          label="Follow-up"
          onClick={handleFollowUpClick}
        />
        <QuickAction
          icon={MessageSquare}
          label="Message"
          onClick={handleMessageClick}
        />
      </div>

      {/* CRM action dialogs */}
      {profile.crm.contact_id && (
        <EmailComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          contactId={profile.crm.contact_id}
          contactEmail={profile.email}
          contactName={profile.name}
          listingId={scopeListingId}
          listingTitle={scopeListingTitle}
          onSent={refreshPanel}
        />
      )}
      <CallLogDialog
        open={callOpen}
        onOpenChange={setCallOpen}
        contactId={profile.crm.contact_id}
        buyerUserId={buyerUserIdForActions}
        contactName={profile.name}
        contactPhone={profile.phone}
        listingId={scopeListingId}
        onLogged={refreshPanel}
      />
      <AddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        contactId={profile.crm.contact_id}
        buyerUserId={buyerUserIdForActions}
        contactName={profile.name}
        listingId={scopeListingId}
        onSaved={refreshPanel}
      />
      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        contactId={profile.crm.contact_id}
        buyerUserId={buyerUserIdForActions}
        contactName={profile.name}
        listingId={scopeListingId}
        onSaved={refreshPanel}
      />

      {/* Snapshot */}
      <SectionHeader title="Snapshot" />
      <div className="px-6 pb-4 grid grid-cols-2 gap-3 text-xs">
        <SnapshotItem
          icon={Clock}
          label="Last contacted"
          value={fmtDate(profile.crm.last_contacted_at)}
        />
        <SnapshotItem
          icon={CalendarClock}
          label="Next follow-up"
          value={fmtDate(profile.crm.next_follow_up_at)}
          tone={isOverdue(profile.crm.next_follow_up_at) ? "warn" : "default"}
        />
        <SnapshotItem
          icon={Clock}
          label="First interaction"
          value={fmtDate(profile.crm.first_interaction_at)}
        />
        <SnapshotItem
          icon={Clock}
          label="Last active"
          value={fmtRelative(profile.last_active_at)}
        />
      </div>

      {/* Buyer details */}
      {!isLite && hasBuyerDetails(profile) && (
        <>
          <SectionHeader title="Buyer details" />
          <div className="px-6 pb-4 space-y-2 text-xs">
            <DetailRow
              icon={DollarSign}
              label="Budget"
              value={fmtBudget(
                profile.preferences.budget_min,
                profile.preferences.budget_max,
              )}
            />
            <DetailRow
              icon={Target}
              label="Timeframe"
              value={fmtTimeframe(profile.preferences.timeframe)}
            />
            <DetailRow
              icon={DollarSign}
              label="Funding"
              value={fmtFunding(profile.preferences.funding_status)}
            />
            <DetailRow
              icon={Building2}
              label="Industries"
              value={
                profile.preferences.preferred_industries.length
                  ? profile.preferences.preferred_industries.join(", ")
                  : null
              }
            />
            <DetailRow
              icon={Building2}
              label="Locations"
              value={
                profile.preferences.preferred_locations.length
                  ? profile.preferences.preferred_locations.join(", ")
                  : profile.preferences.location_text
              }
            />
            <DetailRow
              icon={Clock}
              label="Account created"
              value={fmtDate(profile.created_at)}
            />
          </div>
        </>
      )}

      {/* Tags + interest + notes */}
      {(profile.crm.tags.length > 0 ||
        profile.crm.interest ||
        profile.crm.notes) && (
        <>
          <SectionHeader title="CRM" />
          <div className="px-6 pb-4 space-y-3 text-xs">
            {profile.crm.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <TagIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {profile.crm.tags.map((t) => (
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
            {profile.crm.interest && (
              <DetailRow
                icon={Target}
                label="Interest"
                value={profile.crm.interest}
              />
            )}
            {profile.crm.notes && (
              <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap">
                {profile.crm.notes}
              </div>
            )}
          </div>
        </>
      )}

      {/* Activity timeline (compact, top 12) */}
      {profile.activity.length > 0 && (
        <>
          <SectionHeader
            title="Recent activity"
            right={
              <Link
                href={fullProfileHref}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            }
          />
          <div className="px-6 pb-4 space-y-2">
            {profile.activity.slice(0, 12).map((evt) => (
              <ActivityRow
                key={evt.id}
                event={evt}
                listingTitle={
                  profile.listings.find((l) => l.listing_id === evt.listing_id)
                    ?.title
                }
              />
            ))}
          </div>
        </>
      )}

      {/* Listings */}
      {profile.listings.length > 0 && (
        <>
          <SectionHeader title="Engaged listings" />
          <div className="px-6 pb-6 space-y-2">
            {profile.listings.map((l) => (
              <div
                key={l.listing_id}
                className="rounded-md border p-2 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/listing/${l.slug}`}
                    target="_blank"
                    className="font-medium truncate hover:underline"
                  >
                    {l.title}
                  </Link>
                  <Badge variant="outline" className="text-[10px]">
                    {l.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground text-[11px]">
                  <span>{l.views} views</span>
                  {l.return_visits > 0 && (
                    <span>{l.return_visits} returns</span>
                  )}
                  <span>{l.enquiries} enquiries</span>
                  <span>{l.calls} calls</span>
                  <span>
                    {l.documents_viewed} doc views
                    {l.documents_downloaded > 0 && (
                      <> · {l.documents_downloaded} downloads</>
                    )}
                  </span>
                  {l.nda_signed && (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      NDA ✓
                    </span>
                  )}
                  {l.saved && (
                    <span className="text-pink-700 dark:text-pink-300">
                      Saved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state for lite contacts */}
      {isLite && profile.activity.length === 0 && (
        <div className="px-6 py-8 text-center text-xs text-muted-foreground">
          This contact was added manually. There’s no activity yet because the
          buyer hasn’t signed in or interacted with any of your listings.
        </div>
      )}
    </div>
  );
}

// ── Small primitives ──────────────────────────────────────────────────────

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="px-6 pt-4 pb-2 flex items-center justify-between">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {right}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-md border bg-background px-2 py-2 text-[11px] hover:bg-muted transition"
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SnapshotItem({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
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
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="font-medium mt-0.5">{value ?? "—"}</p>
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

function ActivityRow({
  event,
  listingTitle,
}: {
  event: BuyerActivityEvent;
  listingTitle: string | undefined;
}) {
  const Icon = ACTIVITY_ICON[event.kind];
  return (
    <div className="flex items-start gap-2 text-xs">
      <div className="rounded-full bg-muted h-6 w-6 flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="leading-tight">
          <span className="font-medium">{ACTIVITY_LABEL[event.kind]}</span>
          {listingTitle && (
            <>
              {" "}
              <span className="text-muted-foreground">·</span>{" "}
              <span className="text-muted-foreground truncate">
                {listingTitle}
              </span>
            </>
          )}
        </p>
        {event.detail && (
          <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">
            {event.detail}
          </p>
        )}
        <Separator className="mt-1.5" />
      </div>
      <span className="text-muted-foreground text-[11px] shrink-0">
        {fmtRelative(event.at)}
      </span>
    </div>
  );
}

// ── Formatting helpers ────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return fmtDate(iso);
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function hasBuyerDetails(p: BuyerProfile): boolean {
  return (
    p.preferences.budget_min !== null ||
    p.preferences.budget_max !== null ||
    p.preferences.preferred_industries.length > 0 ||
    p.preferences.preferred_locations.length > 0 ||
    p.preferences.funding_status !== null ||
    p.preferences.timeframe !== null ||
    !!p.preferences.location_text
  );
}

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

function fmtTimeframe(t: string | null): string | null {
  switch (t) {
    case "lt_3m":
      return "Within 3 months";
    case "3_6m":
      return "3–6 months";
    case "6_12m":
      return "6–12 months";
    case "gt_12m":
      return "More than 12 months";
    case "unspecified":
      return "Unspecified";
    default:
      return null;
  }
}

function fmtFunding(t: string | null): string | null {
  switch (t) {
    case "self_funded":
      return "Self-funded";
    case "pre_approved":
      return "Pre-approved";
    case "seeking_finance":
      return "Seeking finance";
    case "unspecified":
      return "Unspecified";
    default:
      return null;
  }
}
