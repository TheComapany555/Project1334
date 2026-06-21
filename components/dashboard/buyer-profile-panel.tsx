"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmailComposer } from "@/components/dashboard/email-composer";
import { CallLogDialog } from "@/components/dashboard/call-log-dialog";
import { AddNoteDialog } from "@/components/dashboard/add-note-dialog";
import { AddFeedbackDialog } from "@/components/dashboard/add-feedback-dialog";
import { FollowUpDialog } from "@/components/dashboard/follow-up-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setContactStatus, setContactListingStatus } from "@/lib/actions/crm";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Mail,
  Phone,
  CalendarClock,
  Clock,
  Eye,
  MessageSquare,
  Heart,
  ShieldCheck,
  FileText,
  StickyNote,
  PhoneCall,
  ClipboardList,
  Building2,
  DollarSign,
  Target,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TAG_COLOR_CLASSES,
  BUYER_CRM_STATUSES,
  CONTACT_SOURCE_LABEL,
} from "@/lib/types/contacts";
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
  sold: "Sold",
  lost: "Lost",
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
  sold: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

// ── Communication history (broker ↔ buyer interactions) ────────────────────

const COMM_KINDS: BuyerActivityKind[] = [
  "enquiry",
  "email_sent",
  "email_received",
  "call_logged",
  "message_sent",
  "message_received",
  "listing_shared",
  "feedback_logged",
];

const COMM_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  enquiry: { label: "Enquiry received", icon: MessageSquare },
  email_sent: { label: "Email sent", icon: Mail },
  email_received: { label: "Email received", icon: Mail },
  call_logged: { label: "Call logged", icon: PhoneCall },
  message_sent: { label: "Message sent", icon: MessageSquare },
  message_received: { label: "Message received", icon: MessageSquare },
  listing_shared: { label: "Listing shared", icon: Building2 },
  feedback_logged: { label: "Feedback logged", icon: ClipboardList },
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const closePanel = useBuyerPanelStore((s) => s.close);
  const isLite = target.kind === "contact" && !profile.crm.contact_id;
  const status = profile.crm.status;
  // Notes logged via the Note action — surfaced here with full text (newest
  // first) so they don't vanish into the engagement counts.
  const noteEvents = profile.activity.filter((e) => e.kind === "note_added");
  // Broker ↔ buyer communication log (emails, calls, messages, shares).
  const commEvents = profile.activity.filter((e) => COMM_KINDS.includes(e.kind));
  const commListingTitleById = new Map(
    profile.listings.map((l) => [l.listing_id, l.title] as const),
  );
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
  const handleFeedbackClick = () => {
    if (!canActOnCrm) {
      toast.error("Couldn't save — contact missing");
      return;
    }
    setFeedbackOpen(true);
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

  const handleListingStatusChange = async (listingId: string, next: string) => {
    if (!profile.crm.contact_id) return;
    const res = await setContactListingStatus(
      profile.crm.contact_id,
      listingId,
      next as BuyerCrmStatus,
    );
    if (res.ok) {
      toast.success("Listing stage updated");
      refreshPanel();
    } else {
      toast.error(res.error ?? "Couldn't update stage.");
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
      <div className="px-6 py-5 border-b bg-gradient-to-b from-muted/20 to-transparent">
        <SheetHeader className="p-0 space-y-2">
          <SheetTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Buyer profile
          </SheetTitle>
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
                    {BUYER_CRM_STATUSES.map((s) => (
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
      <div className="px-6 py-3 border-b grid grid-cols-3 gap-2.5">
        <QuickAction icon={Mail} label="Email" onClick={handleEmailClick} />
        <QuickAction icon={PhoneCall} label="Call" onClick={handleCallClick} />
        <QuickAction icon={StickyNote} label="Note" onClick={handleNoteClick} />
        <QuickAction
          icon={ClipboardList}
          label="Feedback"
          onClick={handleFeedbackClick}
        />
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
      <AddFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
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
        <SnapshotItem
          icon={Building2}
          label="Brought in by"
          value={
            profile.crm.source
              ? profile.crm.reason_listing_title
                ? `${CONTACT_SOURCE_LABEL[profile.crm.source]} · ${profile.crm.reason_listing_title}`
                : CONTACT_SOURCE_LABEL[profile.crm.source]
              : null
          }
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

      {/* Notes — full text of notes logged via the Note action. */}
      {noteEvents.length > 0 && (
        <>
          <SectionHeader title="Notes" />
          <div className="px-6 pb-4 space-y-2">
            {noteEvents.map((n) => (
              <div
                key={n.id}
                className="rounded-md border bg-muted/30 p-2.5 text-xs"
              >
                <p className="mb-1 text-[10px] text-muted-foreground">
                  {fmtRelative(n.at)}
                </p>
                <p className="whitespace-pre-wrap">{n.body ?? n.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Communication history — broker ↔ buyer interactions, newest first. */}
      {commEvents.length > 0 && (
        <>
          <SectionHeader title="Communication" />
          <div className="px-6 pb-4 space-y-2">
            {commEvents.slice(0, 6).map((e) => {
              const meta = COMM_META[e.kind] ?? {
                label: e.kind,
                icon: MessageSquare,
              };
              const Icon = meta.icon;
              const listingTitle = e.listing_id
                ? commListingTitleById.get(e.listing_id)
                : null;
              return (
                <div key={e.id} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-medium">{meta.label}</span>
                      {listingTitle && (
                        <span className="text-muted-foreground">
                          {" · "}
                          {listingTitle}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtRelative(e.at)}
                    </p>
                  </div>
                </div>
              );
            })}
            {commEvents.length > 6 && (
              <Link
                href={fullProfileHref}
                className="text-[10px] text-primary hover:underline"
              >
                +{commEvents.length - 6} more on the full profile
              </Link>
            )}
          </div>
        </>
      )}

      {/* Engagement counts (privacy-first replacement for the full timeline).
          Brokers don't need to see every buyer click — just how engaged the
          buyer has been overall and how their outreach is landing. */}
      {profile.activity.length > 0 && (
        <>
          <SectionHeader title="Engagement" />
          <div className="px-6 pb-4">
            <EngagementGrid activity={profile.activity} />
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
                {profile.crm.contact_id ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Stage
                    </span>
                    <Select
                      value={l.pipeline_status ?? "new_lead"}
                      onValueChange={(v) =>
                        handleListingStatusChange(l.listing_id, v)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-6 text-[10px] gap-1 px-2 border w-auto min-w-[110px]",
                          STATUS_TONE[l.pipeline_status ?? "new_lead"],
                        )}
                        aria-label="Pipeline stage for this listing"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUYER_CRM_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : l.pipeline_status ? (
                  <div className="pt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        STATUS_TONE[l.pipeline_status],
                      )}
                    >
                      {STATUS_LABEL[l.pipeline_status]}
                    </Badge>
                  </div>
                ) : null}
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
    <div className="px-6 pt-5 pb-2 flex items-center justify-between">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-3 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/60 active:scale-[0.98] transition-all"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-center leading-tight">{label}</span>
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
        "rounded-lg border bg-background/50 p-2.5 transition-colors",
        tone === "warn" &&
          "border-orange-300 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30",
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p
        className={cn(
          "font-medium mt-1 text-xs",
          !value && "text-muted-foreground/60 italic",
        )}
      >
        {value ?? "—"}
      </p>
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

/**
 * Aggregate engagement summary that replaces the per-event timeline.
 *
 * Privacy intent: brokers see *how engaged* the buyer is and *how their own
 * outreach is landing*, not every click the buyer makes. We split buyer-side
 * signals (views, downloads, NDA, etc.) from broker outreach (emails, calls,
 * notes) and lead with the "Emails opened" stat since that's the highest-
 * value read-receipt signal.
 */
function EngagementGrid({ activity }: { activity: BuyerActivityEvent[] }) {
  const counts: Record<BuyerActivityKind, number> = {
    view: 0,
    enquiry: 0,
    save: 0,
    nda_signed: 0,
    nda_requested: 0,
    document_approved: 0,
    document_viewed: 0,
    document_downloaded: 0,
    call: 0,
    email_sent: 0,
    email_received: 0,
    call_logged: 0,
    note_added: 0,
    follow_up_set: 0,
    follow_up_completed: 0,
    status_changed: 0,
    listing_shared: 0,
    message_sent: 0,
    message_received: 0,
    feedback_logged: 0,
  };
  let emailsOpened = 0;
  let totalEmailOpens = 0;
  for (const e of activity) {
    counts[e.kind] += 1;
    if (e.kind === "email_sent") {
      if (e.opened_at) emailsOpened += 1;
      if (typeof e.open_count === "number") totalEmailOpens += e.open_count;
    }
  }

  const lastEmailSent = activity.find((e) => e.kind === "email_sent");
  const openRate =
    counts.email_sent > 0
      ? Math.round((emailsOpened / counts.email_sent) * 100)
      : null;

  const stats: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    tone?: "default" | "good" | "muted";
    sub?: string;
  }> = [];

  if (counts.email_sent > 0) {
    stats.push({
      icon: Mail,
      label: "Emails opened",
      value: `${emailsOpened} / ${counts.email_sent}`,
      tone: emailsOpened > 0 ? "good" : "muted",
      sub:
        openRate != null
          ? `${openRate}% open rate${
              totalEmailOpens > emailsOpened
                ? ` · ${totalEmailOpens} total opens`
                : ""
            }`
          : undefined,
    });
  }
  if (counts.view > 0) {
    stats.push({ icon: Eye, label: "Listing views", value: String(counts.view) });
  }
  if (counts.enquiry > 0) {
    stats.push({
      icon: MessageSquare,
      label: "Enquiries",
      value: String(counts.enquiry),
    });
  }
  const docTotal = counts.document_viewed + counts.document_downloaded;
  if (docTotal > 0) {
    stats.push({
      icon: FileText,
      label: "Document opens",
      value: String(docTotal),
      sub:
        counts.document_downloaded > 0
          ? `${counts.document_downloaded} downloads`
          : undefined,
    });
  }
  if (counts.nda_signed > 0 || counts.nda_requested > 0) {
    stats.push({
      icon: ShieldCheck,
      label: "NDA",
      value: counts.nda_signed > 0 ? "Signed" : "Requested",
      tone: counts.nda_signed > 0 ? "good" : "default",
    });
  }
  if (counts.call > 0 || counts.call_logged > 0) {
    stats.push({
      icon: PhoneCall,
      label: "Calls",
      value: String(counts.call + counts.call_logged),
    });
  }
  if (counts.save > 0) {
    stats.push({ icon: Heart, label: "Saves", value: String(counts.save) });
  }

  if (stats.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No engagement yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <EngagementStat key={s.label} {...s} />
        ))}
      </div>
      {lastEmailSent && (
        <p className="text-[10px] text-muted-foreground">
          Last email sent {fmtRelative(lastEmailSent.at)}
          {lastEmailSent.opened_at && (
            <>
              {" "}
              · opened {fmtRelative(lastEmailSent.opened_at)}
            </>
          )}
        </p>
      )}
    </div>
  );
}

function EngagementStat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background/50 p-2.5",
        tone === "good" &&
          "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20",
        tone === "muted" && "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="font-semibold mt-1 text-xs tabular-nums">{value}</p>
      {sub && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      )}
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
