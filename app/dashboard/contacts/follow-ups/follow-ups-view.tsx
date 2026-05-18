"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  Building2,
  Search,
} from "lucide-react";
import { completeFollowUp, type FollowUpFeedItem } from "@/lib/actions/crm";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";
import { cn } from "@/lib/utils";

type Props = {
  initialOverdue: FollowUpFeedItem[];
  initialToday: FollowUpFeedItem[];
  initialUpcoming: FollowUpFeedItem[];
  initialCompleted: FollowUpFeedItem[];
};

export function FollowUpsView({
  initialOverdue,
  initialToday,
  initialUpcoming,
  initialCompleted,
}: Props) {
  const router = useRouter();
  const [overdue, setOverdue] = useState(initialOverdue);
  const [today, setToday] = useState(initialToday);
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [completed, setCompleted] = useState(initialCompleted);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filterFn = (arr: FollowUpFeedItem[]) => {
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter((f) =>
      `${f.buyer_name ?? ""} ${f.buyer_email ?? ""} ${f.title} ${f.notes ?? ""} ${f.listing_title ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  };

  const handleComplete = (item: FollowUpFeedItem) => {
    setBusyId(item.id);
    startTransition(async () => {
      const res = await completeFollowUp(item.id);
      setBusyId(null);
      if (res.ok) {
        // Optimistic: move from open scope to completed.
        setOverdue((arr) => arr.filter((f) => f.id !== item.id));
        setToday((arr) => arr.filter((f) => f.id !== item.id));
        setUpcoming((arr) => arr.filter((f) => f.id !== item.id));
        setCompleted((arr) => [
          { ...item, completed_at: new Date().toISOString() },
          ...arr,
        ]);
        toast.success("Follow-up completed");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const overdueFiltered = filterFn(overdue);
  const todayFiltered = filterFn(today);
  const upcomingFiltered = filterFn(upcoming);
  const completedFiltered = filterFn(completed);
  const openTotal = overdue.length + today.length + upcoming.length;

  const initialTab =
    overdue.length > 0
      ? "overdue"
      : today.length > 0
        ? "today"
        : upcoming.length > 0
          ? "upcoming"
          : "completed";

  return (
    <Card className="overflow-hidden">
      {/* Compact stat strip — replaces the giant 4-card grid */}
      <div className="border-b">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x">
          <StatPill
            label="Overdue"
            count={overdue.length}
            icon={AlertTriangle}
            tone="warn"
          />
          <StatPill
            label="Due today"
            count={today.length}
            icon={CalendarClock}
            tone="warm"
          />
          <StatPill
            label="Upcoming"
            count={upcoming.length}
            icon={CalendarClock}
            tone="default"
          />
          <StatPill
            label="Completed"
            count={completed.length}
            icon={CheckCircle2}
            tone="success"
          />
        </div>
      </div>

      <Tabs defaultValue={initialTab}>
        {/* Header: tabs left, search right */}
        <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted/60 p-1 h-auto">
            <TabTrigger value="overdue" label="Overdue" count={overdue.length} />
            <TabTrigger value="today" label="Today" count={today.length} />
            <TabTrigger
              value="upcoming"
              label="Upcoming"
              count={upcoming.length}
            />
            <TabTrigger
              value="completed"
              label="Completed"
              count={completed.length}
            />
          </TabsList>
          <div className="relative max-w-xs sm:flex-1 sm:max-w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search buyer, title, notes…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <TabsContent value="overdue" className="m-0">
          <FollowUpList
            items={overdueFiltered}
            emptyLabel="No overdue follow-ups"
            emptyHint="Anything you scheduled before today and haven't ticked off lands here."
            busyId={busyId}
            onComplete={handleComplete}
            tone="overdue"
          />
        </TabsContent>
        <TabsContent value="today" className="m-0">
          <FollowUpList
            items={todayFiltered}
            emptyLabel="Nothing due today"
            emptyHint="Schedule a follow-up from any buyer profile to land it here."
            busyId={busyId}
            onComplete={handleComplete}
            tone="today"
          />
        </TabsContent>
        <TabsContent value="upcoming" className="m-0">
          <FollowUpList
            items={upcomingFiltered}
            emptyLabel="No upcoming follow-ups"
            emptyHint="Plan ahead — schedule one from the buyer panel."
            busyId={busyId}
            onComplete={handleComplete}
            tone="upcoming"
          />
        </TabsContent>
        <TabsContent value="completed" className="m-0">
          <FollowUpList
            items={completedFiltered}
            emptyLabel="Nothing completed yet"
            emptyHint="Tick off a follow-up to see it here."
            busyId={busyId}
            onComplete={() => {}}
            tone="completed"
            hideCompleteButton
          />
        </TabsContent>
      </Tabs>

      {openTotal > 0 && (
        <div className="border-t bg-muted/20 px-4 sm:px-6 py-2.5 text-xs text-muted-foreground">
          {openTotal} open follow-up{openTotal === 1 ? "" : "s"} · sorted by due date
        </div>
      )}
    </Card>
  );
}

// ─── Tab trigger with count badge ─────────────────────────────────────────

function TabTrigger({
  value,
  label,
  count,
}: {
  value: string;
  label: string;
  count: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs px-3 h-7"
    >
      {label}
      {count > 0 && (
        <Badge
          variant="secondary"
          className="h-4 min-w-4 px-1.5 text-[10px] bg-muted-foreground/15 text-foreground/70"
        >
          {count}
        </Badge>
      )}
    </TabsTrigger>
  );
}

// ─── List ────────────────────────────────────────────────────────────────

function FollowUpList({
  items,
  emptyLabel,
  emptyHint,
  busyId,
  onComplete,
  tone,
  hideCompleteButton,
}: {
  items: FollowUpFeedItem[];
  emptyLabel: string;
  emptyHint: string;
  busyId: string | null;
  onComplete: (item: FollowUpFeedItem) => void;
  tone: "overdue" | "today" | "upcoming" | "completed";
  hideCompleteButton?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 px-6 text-center space-y-2">
        <div className="rounded-full bg-muted h-12 w-12 mx-auto flex items-center justify-center">
          {tone === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          ) : (
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm font-medium">{emptyLabel}</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{emptyHint}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((f) => (
        <FollowUpRow
          key={f.id}
          item={f}
          tone={tone}
          isBusy={busyId === f.id}
          onComplete={() => onComplete(f)}
          hideCompleteButton={hideCompleteButton}
        />
      ))}
    </ul>
  );
}

function FollowUpRow({
  item,
  tone,
  isBusy,
  onComplete,
  hideCompleteButton,
}: {
  item: FollowUpFeedItem;
  tone: "overdue" | "today" | "upcoming" | "completed";
  isBusy: boolean;
  onComplete: () => void;
  hideCompleteButton?: boolean;
}) {
  const openBuyer = useBuyerPanelStore((s) => s.openBuyer);
  const openContact = useBuyerPanelStore((s) => s.openContact);
  const handleOpen = () => {
    if (item.buyer_user_id) openBuyer(item.buyer_user_id, item.listing_id ?? null);
    else if (item.contact_id) openContact(item.contact_id);
  };

  const buyerLabel = item.buyer_name ?? item.buyer_email ?? "Buyer";
  const due = new Date(item.due_at);
  const dueDateStr = due.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dueTimeStr = due.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isAllDay = due.getHours() === 12 && due.getMinutes() === 0;

  return (
    <li
      className={cn(
        "group px-4 sm:px-6 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition",
        tone === "overdue" && "bg-orange-50/15 dark:bg-orange-950/10",
      )}
    >
      {/* Date pill — far left, mimics a calendar block */}
      <div
        className={cn(
          "shrink-0 w-14 text-center rounded-md border py-1.5",
          tone === "overdue" &&
            "border-orange-300/60 bg-orange-100/60 dark:border-orange-900/60 dark:bg-orange-950/40",
          tone === "today" &&
            "border-amber-300/60 bg-amber-100/60 dark:border-amber-900/60 dark:bg-amber-950/40",
          tone === "upcoming" && "border-border bg-background",
          tone === "completed" &&
            "border-emerald-300/60 bg-emerald-100/40 dark:border-emerald-900/60 dark:bg-emerald-950/30",
        )}
      >
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">
          {due.toLocaleDateString("en-AU", { month: "short" })}
        </div>
        <div
          className={cn(
            "text-base font-semibold tabular-nums leading-tight mt-0.5",
            tone === "overdue" && "text-orange-700 dark:text-orange-300",
            tone === "today" && "text-amber-700 dark:text-amber-300",
            tone === "completed" && "text-emerald-700 dark:text-emerald-300",
          )}
        >
          {due.getDate()}
        </div>
        {!isAllDay && (
          <div className="text-[9px] text-muted-foreground tabular-nums leading-none mt-0.5">
            {dueTimeStr}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] tabular-nums",
              tone === "overdue" &&
                "border-orange-300 text-orange-800 dark:border-orange-900/60 dark:text-orange-300",
            )}
          >
            {formatRelative(item.due_at)}
          </Badge>
        </div>
        <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleOpen}
            className="text-foreground hover:underline underline-offset-2 max-w-[180px] truncate font-medium"
          >
            {buyerLabel}
          </button>
          <span className="text-muted-foreground/50">·</span>
          <span className="hidden sm:inline tabular-nums">{dueDateStr}</span>
          {item.listing_title && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1 max-w-[180px] truncate">
                <Building2 className="h-3 w-3" />
                {item.listing_title}
              </span>
            </>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
            {item.notes}
          </p>
        )}
      </div>

      {!hideCompleteButton && (
        <Button
          size="sm"
          variant={tone === "overdue" ? "default" : "outline"}
          className="h-8 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
          disabled={isBusy}
          onClick={onComplete}
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Mark done
        </Button>
      )}
    </li>
  );
}

// ─── Compact stat pill (replaces the giant stat cards) ───────────────────

function StatPill({
  label,
  count,
  icon: Icon,
  tone,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "warn" | "warm" | "success";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 sm:px-5 py-3.5 transition-colors",
        tone === "warn" && count > 0 && "bg-orange-50/40 dark:bg-orange-950/20",
      )}
    >
      <div
        className={cn(
          "rounded-md h-9 w-9 shrink-0 flex items-center justify-center",
          tone === "warn" &&
            "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
          tone === "warm" &&
            "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          tone === "default" &&
            "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
          tone === "success" &&
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums leading-none",
            count === 0 && "text-muted-foreground",
          )}
        >
          {count}
        </p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Format ──────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = t - Date.now();
  const min = Math.round(diff / 60_000);
  if (min < -60 * 24) return `${Math.round(-min / 60 / 24)}d ago`;
  if (min < -60) return `${Math.round(-min / 60)}h ago`;
  if (min < 0) return `${-min}m ago`;
  if (min < 60) return `in ${min}m`;
  if (min < 60 * 24) return `in ${Math.round(min / 60)}h`;
  return `in ${Math.round(min / 60 / 24)}d`;
}
