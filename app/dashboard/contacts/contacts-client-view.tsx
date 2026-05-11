"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Send,
  Trash2,
  Mail,
  Phone,
  Users,
  Loader2,
  Pencil,
  Tag as TagIcon,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  Search,
  X,
  StickyNote,
  CalendarClock,
  PhoneCall,
  Flame,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  addContact,
  deleteContact,
  sendListingToContact,
  updateContact,
} from "@/lib/actions/contacts";
import {
  TAG_COLOR_CLASSES,
  type BrokerContact,
  type BuyerCrmStatus,
  type ContactTag,
} from "@/lib/types/contacts";
import { cn } from "@/lib/utils";
import { ContactTagMultiSelect } from "@/components/dashboard/contact-tag-multi-select";
import { ContactTagManager } from "@/components/dashboard/contact-tag-manager";
import { CallLogDialog } from "@/components/dashboard/call-log-dialog";
import { AddNoteDialog } from "@/components/dashboard/add-note-dialog";
import { FollowUpDialog } from "@/components/dashboard/follow-up-dialog";
import { EmailComposer } from "@/components/dashboard/email-composer";
import { CustomFieldCell } from "@/components/dashboard/custom-field-cell";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";
import { setContactStatus } from "@/lib/actions/crm";
import type { CrmCustomField } from "@/lib/actions/crm-custom-fields";
import { BulkSendTab, type BulkListingItem } from "./bulk-send-tab";

type Props = {
  contacts: BrokerContact[];
  tags: ContactTag[];
  listings: BulkListingItem[];
  customFields?: CrmCustomField[];
  customFieldValues?: Record<string, Record<string, unknown>>;
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  interest: string;
  notes: string;
  consent_marketing: boolean;
  tag_ids: string[];
};

const EMPTY_FORM: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  interest: "",
  notes: "",
  consent_marketing: false,
  tag_ids: [],
};

const SOURCE_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  manual: "Manual",
  share: "Share",
  import: "Import",
};

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

type PresetTab =
  | "all"
  | "hot"
  | "follow_ups_due"
  | "nda_signed"
  | "documents_shared"
  | "negotiating";

const PRESET_TABS: {
  value: PresetTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "all", label: "All", icon: Users },
  { value: "hot", label: "Hot leads", icon: Flame },
  { value: "follow_ups_due", label: "Follow-ups due", icon: CalendarClock },
  { value: "nda_signed", label: "NDA signed", icon: ShieldCheck },
  { value: "documents_shared", label: "Documents shared", icon: FileText },
  { value: "negotiating", label: "Negotiating", icon: TrendingUp },
];

type LastActivityFilter = "any" | "today" | "7d" | "30d" | "90d" | "older";

const LAST_ACTIVITY_LABELS: Record<LastActivityFilter, string> = {
  any: "Any time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  older: "Older than 90 days",
};

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now() + 60_000; // include "due now"
}

function fmtRelative(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (Math.abs(diff) < 60_000) return "now";
  const min = Math.round(diff / 60_000);
  if (min < 60 && min > 0) return `${min}m ago`;
  if (min < 0 && min > -60 * 24) return `in ${Math.round(-min / 60)}h`;
  if (min < 0) return `in ${Math.round(-min / 60 / 24)}d`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

export function ContactsClientView({
  contacts,
  tags: initialTags,
  listings,
  customFields = [],
  customFieldValues = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openBuyer = useBuyerPanelStore((s) => s.openBuyer);
  const openContact = useBuyerPanelStore((s) => s.openContact);
  const handleOpenPanel = (c: BrokerContact) => {
    if (c.buyer_user_id) openBuyer(c.buyer_user_id);
    else openContact(c.id);
  };
  const [tags, setTags] = useState(initialTags);

  // ─── Filter state (URL-synced) ───
  const presetFromUrl = (searchParams.get("preset") as PresetTab) ?? "all";
  const [preset, setPreset] = useState<PresetTab>(
    PRESET_TABS.some((t) => t.value === presetFromUrl) ? presetFromUrl : "all",
  );
  const [tagFilter, setTagFilter] = useState<string | null>(
    searchParams.get("tag") ?? null,
  );
  const [consentFilter, setConsentFilter] = useState<"all" | "yes" | "no">(
    (searchParams.get("consent") as "all" | "yes" | "no") ?? "all",
  );
  const [statusFilter, setStatusFilter] = useState<BuyerCrmStatus | "all">(
    (searchParams.get("status") as BuyerCrmStatus | "all") ?? "all",
  );
  const [activityFilter, setActivityFilter] = useState<LastActivityFilter>(
    (searchParams.get("activity") as LastActivityFilter) ?? "any",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  // Sync filters → URL on change so filtered views are shareable.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (preset !== "all") sp.set("preset", preset);
    if (tagFilter) sp.set("tag", tagFilter);
    if (consentFilter !== "all") sp.set("consent", consentFilter);
    if (statusFilter !== "all") sp.set("status", statusFilter);
    if (activityFilter !== "any") sp.set("activity", activityFilter);
    if (search.trim()) sp.set("q", search.trim());
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [preset, tagFilter, consentFilter, statusFilter, activityFilter, search, router]);

  // ─── Dialogs ───
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BrokerContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrokerContact | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const [sendOpen, setSendOpen] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // CRM action dialogs (opened from row quick actions)
  const [emailTarget, setEmailTarget] = useState<BrokerContact | null>(null);
  const [callTarget, setCallTarget] = useState<BrokerContact | null>(null);
  const [noteTarget, setNoteTarget] = useState<BrokerContact | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<BrokerContact | null>(null);

  const [, startTransition] = useTransition();

  const HOT_TAG_NAMES = ["hot lead", "hot", "vip"];

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<LastActivityFilter, number | null> = {
      any: null,
      today: now - 24 * 3600 * 1000,
      "7d": now - 7 * 24 * 3600 * 1000,
      "30d": now - 30 * 24 * 3600 * 1000,
      "90d": now - 90 * 24 * 3600 * 1000,
      older: 0,
    };

    return contacts.filter((c) => {
      // Preset filters (override individual status filter unless set)
      if (preset === "hot") {
        const hasHotTag = c.tags.some((t) =>
          HOT_TAG_NAMES.includes(t.name.trim().toLowerCase()),
        );
        if (!hasHotTag) return false;
      } else if (preset === "follow_ups_due") {
        if (!c.next_follow_up_at || !isOverdue(c.next_follow_up_at)) return false;
      } else if (preset === "nda_signed") {
        if (c.status !== "nda_signed") return false;
      } else if (preset === "documents_shared") {
        if (c.status !== "documents_shared") return false;
      } else if (preset === "negotiating") {
        if (c.status !== "negotiating") return false;
      }

      if (tagFilter && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (consentFilter === "yes" && !c.consent_marketing) return false;
      if (consentFilter === "no" && c.consent_marketing) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;

      if (activityFilter !== "any") {
        const last = c.last_contacted_at
          ? new Date(c.last_contacted_at).getTime()
          : null;
        const cutoff = cutoffs[activityFilter];
        if (activityFilter === "older") {
          if (!last || last >= now - 90 * 24 * 3600 * 1000) return false;
        } else {
          if (!last || (cutoff && last < cutoff)) return false;
        }
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const blob = `${c.name ?? ""} ${c.email} ${c.company ?? ""} ${c.interest ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, preset, tagFilter, consentFilter, statusFilter, activityFilter, search]);

  const hasFilters =
    preset !== "all" ||
    !!tagFilter ||
    consentFilter !== "all" ||
    statusFilter !== "all" ||
    activityFilter !== "any" ||
    !!search.trim();

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteContact(deleteTarget.id);
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  async function handleSend() {
    if (!sendOpen || !selectedListing) return;
    setSendStatus("sending");
    const res = await sendListingToContact(sendOpen, selectedListing);
    setSendStatus(res.ok ? "sent" : "error");
    if (res.ok) {
      setTimeout(() => {
        setSendOpen(null);
        setSendStatus("idle");
        setSelectedListing("");
      }, 1500);
    }
  }

  async function handleRowStatusChange(contactId: string, next: BuyerCrmStatus) {
    const res = await setContactStatus(contactId, next);
    if (res.ok) startTransition(() => router.refresh());
  }

  // ─── Counters for the tab strip badges ───
  const presetCounts = useMemo(() => {
    const counts: Record<PresetTab, number> = {
      all: contacts.length,
      hot: 0,
      follow_ups_due: 0,
      nda_signed: 0,
      documents_shared: 0,
      negotiating: 0,
    };
    for (const c of contacts) {
      if (c.tags.some((t) => HOT_TAG_NAMES.includes(t.name.trim().toLowerCase())))
        counts.hot++;
      if (c.next_follow_up_at && isOverdue(c.next_follow_up_at))
        counts.follow_ups_due++;
      if (c.status === "nda_signed") counts.nda_signed++;
      if (c.status === "documents_shared") counts.documents_shared++;
      if (c.status === "negotiating") counts.negotiating++;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts]);

  return (
    <>
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-4 w-4" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="bulk-send" className="gap-1.5">
            <Send className="h-4 w-4" />
            Bulk Send
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-send">
          <BulkSendTab contacts={contacts} tags={tags} listings={listings} />
        </TabsContent>

        <TabsContent value="contacts">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base">All CRM contacts</CardTitle>
            <CardDescription>
              {contacts.length === 0
                ? "No contacts yet. Save enquiries or add contacts manually."
                : `${contacts.length} total${filtered.length !== contacts.length ? `, ${filtered.length} shown` : ""}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setTagManagerOpen(true)}
            >
              <TagIcon className="h-4 w-4" />
              Manage tags
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add contact
            </Button>
          </div>
        </CardHeader>

        {/* Tab strip — preset filters */}
        <div className="border-b px-4 sm:px-6 overflow-x-auto">
          <div className="flex items-center gap-1 py-2 min-w-max">
            {PRESET_TABS.map((t) => {
              const Icon = t.icon;
              const count = presetCounts[t.value];
              const active = preset === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPreset(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {count > 0 && (
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, company, interest"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as BuyerCrmStatus | "all")}
          >
            <SelectTrigger size="sm" className="w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any pipeline stage</SelectItem>
              {(
                Object.keys(STATUS_LABEL) as BuyerCrmStatus[]
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activityFilter}
            onValueChange={(v) => setActivityFilter(v as LastActivityFilter)}
          >
            <SelectTrigger size="sm" className="w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LAST_ACTIVITY_LABELS) as LastActivityFilter[]).map(
                (k) => (
                  <SelectItem key={k} value={k}>
                    {LAST_ACTIVITY_LABELS[k]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={consentFilter}
            onValueChange={(v) => setConsentFilter(v as typeof consentFilter)}
          >
            <SelectTrigger size="sm" className="w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All consent statuses</SelectItem>
              <SelectItem value="yes">Consent given</SelectItem>
              <SelectItem value="no">No consent</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {tags.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                No tags yet. Use Manage tags to create one.
              </span>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={cn(
                    "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium transition",
                    tagFilter === tag.id
                      ? TAG_COLOR_CLASSES[tag.color]
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tag.name}
                </button>
              ))
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => {
                  setPreset("all");
                  setTagFilter(null);
                  setConsentFilter("all");
                  setStatusFilter("all");
                  setActivityFilter("any");
                  setSearch("");
                }}
              >
                <X className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="font-medium">
                  {contacts.length === 0
                    ? "No contacts yet"
                    : "No contacts match your filter"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {contacts.length === 0
                    ? "Save contacts from enquiries or add them manually to build your contact list."
                    : "Try clearing the search or filters above."}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 sm:pl-6">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Tags</TableHead>
                  <TableHead className="hidden lg:table-cell">Last activity</TableHead>
                  {customFields.map((f) => (
                    <TableHead
                      key={f.id}
                      className="hidden 2xl:table-cell text-xs"
                      title={f.label}
                    >
                      {f.label}
                    </TableHead>
                  ))}
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead className="hidden sm:table-cell">Consent</TableHead>
                  <TableHead className="pr-4 sm:pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const followUpDue =
                    c.next_follow_up_at && isOverdue(c.next_follow_up_at);
                  return (
                    <TableRow key={c.id} className="group">
                      <TableCell className="pl-4 sm:pl-6 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                              {getInitials(c.name, c.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenPanel(c)}
                              className="text-sm font-medium truncate hover:underline underline-offset-2 text-left"
                            >
                              {c.name || c.email}
                            </button>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <a
                                href={`mailto:${encodeURIComponent(c.email)}`}
                                className="flex items-center gap-1 truncate text-primary hover:underline underline-offset-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-3 w-3 shrink-0" />
                                {c.email}
                              </a>
                              {c.phone ? (
                                <a
                                  href={`tel:${c.phone.replace(/\s+/g, "").replace(/[^\d+]/g, "")}`}
                                  className="flex items-center gap-1 text-primary hover:underline underline-offset-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open call-log dialog after dialer opens.
                                    setTimeout(() => setCallTarget(c), 250);
                                  }}
                                >
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {c.phone}
                                </a>
                              ) : null}
                              {c.company && (
                                <span className="truncate">{c.company}</span>
                              )}
                            </div>
                            {followUpDue && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-orange-700 dark:text-orange-300">
                                <CalendarClock className="h-2.5 w-2.5" />
                                Follow-up{" "}
                                {fmtRelative(c.next_follow_up_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3 align-top">
                        <Select
                          value={c.status ?? "new_lead"}
                          onValueChange={(v) =>
                            handleRowStatusChange(c.id, v as BuyerCrmStatus)
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className={cn(
                              "h-7 text-[10px] gap-1 px-2 border w-auto min-w-[110px]",
                              STATUS_TONE[c.status ?? "new_lead"],
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABEL) as BuyerCrmStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {STATUS_LABEL[s]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell py-3 align-top">
                        {c.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <Badge
                                key={t.id}
                                variant="outline"
                                className={cn("text-[10px]", TAG_COLOR_CLASSES[t.color])}
                              >
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-3 align-top">
                        <div className="text-xs text-muted-foreground">
                          {c.last_contacted_at ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {fmtRelative(c.last_contacted_at)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>
                      </TableCell>
                      {customFields.map((f) => (
                        <TableCell
                          key={f.id}
                          className="hidden 2xl:table-cell py-3 align-top"
                        >
                          <CustomFieldCell
                            field={f}
                            contactId={c.id}
                            initialValue={customFieldValues[c.id]?.[f.id]}
                            canEdit={true}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="hidden sm:table-cell py-3 align-top">
                        <Badge variant="outline" className="text-[10px]">
                          {SOURCE_LABELS[c.source] ?? c.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-3 align-top">
                        {c.consent_marketing ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-300"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground"
                          >
                            <ShieldOff className="h-2.5 w-2.5" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 sm:pr-6 py-3 align-top text-right">
                        <div className="inline-flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Email"
                            disabled={!c.consent_marketing && false /* allow */}
                            onClick={() => setEmailTarget(c)}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Log call"
                            onClick={() => setCallTarget(c)}
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Add note"
                            onClick={() => setNoteTarget(c)}
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Schedule follow-up"
                            onClick={() => setFollowUpTarget(c)}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="More actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onSelect={() => handleOpenPanel(c)}>
                                <Users className="h-3.5 w-3.5" />
                                Open profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setEditTarget(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                              {listings.length > 0 && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setSendOpen(c.id);
                                    setSendStatus("idle");
                                    setSelectedListing("");
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Send listing
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleteTarget(c)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <ContactFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Contact"
        description="Add a new contact to your list."
        tags={tags}
        onTagsChanged={setTags}
        initial={EMPTY_FORM}
        emailEditable
        submitLabel="Save Contact"
        onSubmit={async (form) => {
          const res = await addContact(form);
          if (!res.ok) return res.error ?? "Failed to add contact";
          startTransition(() => router.refresh());
          return null;
        }}
      />

      {/* Edit dialog */}
      <ContactFormDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        title="Edit Contact"
        description="Update contact details and tags."
        tags={tags}
        onTagsChanged={setTags}
        initial={
          editTarget
            ? {
                name: editTarget.name ?? "",
                email: editTarget.email,
                phone: editTarget.phone ?? "",
                company: editTarget.company ?? "",
                interest: editTarget.interest ?? "",
                notes: editTarget.notes ?? "",
                consent_marketing: editTarget.consent_marketing,
                tag_ids: editTarget.tags.map((t) => t.id),
              }
            : EMPTY_FORM
        }
        emailEditable={false}
        submitLabel="Save Changes"
        onSubmit={async (form) => {
          if (!editTarget) return "Missing contact";
          const res = await updateContact(editTarget.id, {
            name: form.name,
            phone: form.phone,
            company: form.company,
            interest: form.interest,
            notes: form.notes,
            consent_marketing: form.consent_marketing,
            tag_ids: form.tag_ids,
          });
          if (!res.ok) return res.error ?? "Failed to update";
          setEditTarget(null);
          startTransition(() => router.refresh());
          return null;
        }}
      />

      {/* CRM action dialogs (row quick actions) */}
      {emailTarget && (
        <EmailComposer
          open={!!emailTarget}
          onOpenChange={(o) => !o && setEmailTarget(null)}
          contactId={emailTarget.id}
          contactEmail={emailTarget.email}
          contactName={emailTarget.name}
          onSent={() => {
            setEmailTarget(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
      {callTarget && (
        <CallLogDialog
          open={!!callTarget}
          onOpenChange={(o) => !o && setCallTarget(null)}
          contactId={callTarget.id}
          buyerUserId={callTarget.buyer_user_id}
          contactName={callTarget.name}
          contactPhone={callTarget.phone}
          onLogged={() => {
            setCallTarget(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
      {noteTarget && (
        <AddNoteDialog
          open={!!noteTarget}
          onOpenChange={(o) => !o && setNoteTarget(null)}
          contactId={noteTarget.id}
          buyerUserId={noteTarget.buyer_user_id}
          contactName={noteTarget.name}
          onSaved={() => {
            setNoteTarget(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
      {followUpTarget && (
        <FollowUpDialog
          open={!!followUpTarget}
          onOpenChange={(o) => !o && setFollowUpTarget(null)}
          contactId={followUpTarget.id}
          buyerUserId={followUpTarget.buyer_user_id}
          contactName={followUpTarget.name}
          onSaved={() => {
            setFollowUpTarget(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {/* Tag manager */}
      <ContactTagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={tags}
        onTagsChanged={(t) => {
          setTags(t);
          startTransition(() => router.refresh());
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name || deleteTarget?.email}
              </span>{" "}
              from your contact list. Their tags and consent record will be removed too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send listing dialog */}
      <Dialog
        open={!!sendOpen}
        onOpenChange={(open) => {
          if (!open) setSendOpen(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Listing</DialogTitle>
            <DialogDescription>
              Choose a listing to email to this contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Select listing</Label>
            <Select value={selectedListing} onValueChange={setSelectedListing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a listing" />
              </SelectTrigger>
              <SelectContent>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            {sendStatus === "sent" ? (
              <p className="text-sm font-medium text-primary">Sent successfully.</p>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!selectedListing || sendStatus === "sending"}
              >
                {sendStatus === "sending" && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                )}
                {sendStatus === "error" ? "Retry" : "Send Email"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ContactFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  emailEditable,
  submitLabel,
  tags,
  onTagsChanged,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial: ContactFormState;
  emailEditable: boolean;
  submitLabel: string;
  tags: ContactTag[];
  onTagsChanged: (tags: ContactTag[]) => void;
  onSubmit: (form: ContactFormState) => Promise<string | null>;
}) {
  const [form, setForm] = useState<ContactFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialKey = `${initial.email}-${initial.name}-${initial.tag_ids.join(",")}`;
  const [lastKey, setLastKey] = useState(initialKey);
  if (open && lastKey !== initialKey) {
    setForm(initial);
    setError(null);
    setLastKey(initialKey);
  }

  const handleSubmit = async () => {
    setError(null);
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    setSubmitting(true);
    const err = await onSubmit(form);
    setSubmitting(false);
    if (err) setError(err);
    else if (emailEditable) {
      setForm(EMPTY_FORM);
      setLastKey("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="04XX XXX XXX"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email *</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="john@example.com"
              disabled={!emailEditable}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-company">Company</Label>
            <Input
              id="c-company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-interest">Interest</Label>
            <Input
              id="c-interest"
              value={form.interest}
              onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))}
              placeholder="e.g. Cafe in Sydney under $500k"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <ContactTagMultiSelect
              allTags={tags}
              selectedIds={form.tag_ids}
              onChange={(ids) => setForm((f) => ({ ...f, tag_ids: ids }))}
              onTagCreated={(tag) => onTagsChanged([...tags, tag])}
            />
          </div>
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <Checkbox
              id="c-consent"
              checked={form.consent_marketing}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, consent_marketing: v === true }))
              }
            />
            <Label htmlFor="c-consent" className="text-xs leading-relaxed">
              Contact has consented to receive marketing communications such as
              listing emails. Required before sending bulk emails.
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
