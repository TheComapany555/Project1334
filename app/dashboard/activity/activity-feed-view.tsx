"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity as ActivityIcon,
  AtSign,
  Building2,
  CalendarClock,
  Check,
  ClipboardList,
  ExternalLink,
  Eye,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  MessagesSquare,
  Phone,
  PhoneOutgoing,
  Search,
  Share2,
  ShieldCheck,
  ShieldQuestion,
  StickyNote,
  TrendingUp,
  X,
  FileText,
  FileSearch,
  Download,
  Heart,
} from "lucide-react";
import {
  listBrokerActivities,
  type ActivityFeedItem,
  type CrmActivityKind,
} from "@/lib/actions/crm";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<CrmActivityKind, string> = {
  email_sent: "Email sent",
  email_received: "Email received",
  call_logged: "Call logged",
  note_added: "Note added",
  follow_up_set: "Follow-up scheduled",
  follow_up_completed: "Follow-up completed",
  status_changed: "Status changed",
  message_sent: "Message sent",
  message_received: "Message received",
  listing_shared: "Listing shared",
  feedback_logged: "Feedback",
};

const KIND_ICON: Record<
  CrmActivityKind,
  React.ComponentType<{ className?: string }>
> = {
  email_sent: AtSign,
  email_received: Inbox,
  call_logged: PhoneOutgoing,
  note_added: StickyNote,
  follow_up_set: CalendarClock,
  follow_up_completed: Check,
  status_changed: TrendingUp,
  message_sent: MessagesSquare,
  message_received: MessagesSquare,
  listing_shared: Share2,
  feedback_logged: ClipboardList,
};

const KIND_TONE: Record<CrmActivityKind, string> = {
  email_sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  email_received: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  call_logged:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  note_added: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  follow_up_set:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  follow_up_completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  status_changed:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  message_sent: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  message_received:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  listing_shared:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  feedback_logged:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
};

const FILTER_PRESETS: { value: "all" | CrmActivityKind; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "email_sent", label: "Emails sent" },
  { value: "email_received", label: "Emails received" },
  { value: "call_logged", label: "Calls" },
  { value: "note_added", label: "Notes" },
  { value: "follow_up_set", label: "Follow-ups scheduled" },
  { value: "follow_up_completed", label: "Follow-ups completed" },
  { value: "status_changed", label: "Status changes" },
  { value: "message_sent", label: "Messages sent" },
  { value: "message_received", label: "Messages received" },
  { value: "listing_shared", label: "Listings shared" },
];

const DATE_RANGES: { value: string; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function ActivityFeedView({
  initialItems,
}: {
  initialItems: ActivityFeedItem[];
}) {
  const router = useRouter();
  const openBuyer = useBuyerPanelStore((s) => s.openBuyer);
  const openContact = useBuyerPanelStore((s) => s.openContact);
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | CrmActivityKind>("all");
  const [dateRange, setDateRange] = useState("any");
  const [isRefreshing, startRefresh] = useTransition();

  const refresh = () => {
    const now = new Date();
    let fromIso: string | null = null;
    if (dateRange === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      fromIso = start.toISOString();
    } else if (dateRange === "7d")
      fromIso = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    else if (dateRange === "30d")
      fromIso = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    else if (dateRange === "90d")
      fromIso = new Date(now.getTime() - 90 * 86_400_000).toISOString();

    startRefresh(async () => {
      const next = await listBrokerActivities({
        q: search.trim() || undefined,
        kinds: kindFilter === "all" ? undefined : [kindFilter],
        fromIso,
        limit: 200,
      });
      setItems(next);
    });
  };

  const grouped = useMemo(() => groupByDay(items), [items]);
  const hasFilters =
    !!search.trim() || kindFilter !== "all" || dateRange !== "any";

  const counts = useMemo(() => {
    const c: Partial<Record<CrmActivityKind, number>> = {};
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);

  const handleOpen = (a: ActivityFeedItem) => {
    if (a.buyer_user_id) openBuyer(a.buyer_user_id, a.listing_id ?? null);
    else if (a.contact_id) openContact(a.contact_id);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base">All activity</CardTitle>
            <CardDescription>
              {items.length === 0
                ? "Nothing logged yet."
                : `${items.length} event${items.length === 1 ? "" : "s"}${hasFilters ? " (filtered)" : ""}`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={isRefreshing}
            className="shrink-0"
          >
            {isRefreshing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            <ActivityIcon className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refresh()}
              placeholder="Search buyer, listing, subject, body…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select
            value={kindFilter}
            onValueChange={(v) => setKindFilter(v as typeof kindFilter)}
          >
            <SelectTrigger size="sm" className="w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger size="sm" className="w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            className="text-xs"
          >
            Apply
          </Button>
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setKindFilter("all");
                setDateRange("any");
                setTimeout(() => refresh(), 0);
              }}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="divide-y">
            {grouped.map(({ day, items: dayItems }) => (
              <div key={day} className="px-4 sm:px-6">
                <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 border-b bg-background/95 backdrop-blur text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
                <ul className="divide-y divide-border/50">
                  {dayItems.map((a) => (
                    <ActivityRow key={a.id} a={a} onOpen={handleOpen} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Summary footer */}
      {items.length > 0 && (
        <div className="border-t bg-muted/20 px-4 sm:px-6 py-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(counts) as [CrmActivityKind, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([kind, n]) => (
                <Badge
                  key={kind}
                  variant="outline"
                  className={cn("text-[10px] gap-1", KIND_TONE[kind])}
                >
                  {KIND_LABEL[kind]} · {n}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────

function ActivityRow({
  a,
  onOpen,
}: {
  a: ActivityFeedItem;
  onOpen: (a: ActivityFeedItem) => void;
}) {
  const Icon = KIND_ICON[a.kind] ?? ActivityIcon;
  return (
    <li className="py-3 flex items-start gap-3">
      <div
        className={cn(
          "rounded-full h-8 w-8 shrink-0 flex items-center justify-center",
          KIND_TONE[a.kind],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium">{KIND_LABEL[a.kind]}</span>
          <button
            type="button"
            onClick={() => onOpen(a)}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
          >
            {a.buyer_name ?? a.buyer_email ?? "Unknown buyer"}
          </button>
          {a.listing_title && a.listing_slug && (
            <>
              <span className="text-muted-foreground/70 text-xs">·</span>
              <Link
                href={`/listing/${a.listing_slug}`}
                target="_blank"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 max-w-[200px] truncate"
              >
                <Building2 className="h-3 w-3" />
                <span className="truncate">{a.listing_title}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </>
          )}
        </div>
        {a.subject && (
          <p className="text-xs text-foreground/90 truncate">{a.subject}</p>
        )}
        {a.body && (
          <p className="text-xs text-muted-foreground line-clamp-1">{a.body}</p>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
        {fmtTime(a.occurred_at)}
      </span>
    </li>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="py-16 px-6 text-center space-y-2">
      <div className="rounded-full bg-muted h-12 w-12 mx-auto flex items-center justify-center">
        <ActivityIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        {hasFilters ? "Nothing matches those filters" : "No activity yet"}
      </p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        {hasFilters
          ? "Try widening the date range or clearing filters."
          : "Once you start logging calls, emails, notes, and follow-ups, they all appear here."}
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `Yesterday · ${d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(
  items: ActivityFeedItem[],
): { day: string; items: ActivityFeedItem[] }[] {
  const out: { day: string; items: ActivityFeedItem[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, today)) return "Today";
    if (sameDay(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year:
        d.getFullYear() === today.getFullYear() ? undefined : "numeric",
    });
  };

  for (const a of items) {
    const day = dayLabel(a.occurred_at);
    const last = out[out.length - 1];
    if (last && last.day === day) last.items.push(a);
    else out.push({ day, items: [a] });
  }
  return out;
}
