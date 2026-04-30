"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Users,
  RefreshCcw,
  MessageSquare,
  Phone,
  ShieldQuestion,
  ShieldCheck,
  FileText,
  Heart,
  CalendarClock,
  Copy,
  Check,
  Flame,
  Mail,
  UserIcon,
  Search,
  Filter,
  Info,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type {
  HotBuyer,
  HotBuyerSignal,
  ListingInsightsMetrics,
} from "@/lib/actions/listing-insights";
import type { AIListingInsights } from "@/lib/ai/listing-insights";

type InsightsResponse = {
  metrics: ListingInsightsMetrics;
  ai: AIListingInsights;
};

type Props = {
  listingId: string;
};

type Period = 7 | 30 | 90;
const PERIODS: { label: string; value: Period }[] = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const SIGNAL_LABEL: Record<HotBuyerSignal, string> = {
  multiple_visits: "Multiple visits",
  nda_requested: "NDA requested",
  nda_signed: "NDA signed",
  saved: "Saved listing",
};

const SIGNAL_TONE: Record<HotBuyerSignal, string> = {
  nda_signed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  nda_requested:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  multiple_visits:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  saved: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};

// Toggle "on" state styling per signal (literal Tailwind classes so JIT picks them up).
const SIGNAL_ACTIVE_CLASSES: Record<HotBuyerSignal, string> = {
  nda_signed:
    "data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 dark:data-[state=on]:bg-emerald-900/40 dark:data-[state=on]:text-emerald-300",
  nda_requested:
    "data-[state=on]:bg-violet-100 data-[state=on]:text-violet-700 dark:data-[state=on]:bg-violet-900/40 dark:data-[state=on]:text-violet-300",
  multiple_visits:
    "data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-900/40 dark:data-[state=on]:text-amber-300",
  saved:
    "data-[state=on]:bg-pink-100 data-[state=on]:text-pink-700 dark:data-[state=on]:bg-pink-900/40 dark:data-[state=on]:text-pink-300",
};

const SIGNAL_ORDER: HotBuyerSignal[] = [
  "nda_signed",
  "nda_requested",
  "multiple_visits",
  "saved",
];

// ─── Main panel ────────────────────────────────────────────────────────────

export function AIInsightsPanel({ listingId }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [, startTransition] = useTransition();
  const inFlight = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh", periodDays: Period) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const res = await fetch(`/api/ai/listings/${listingId}/insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period_days: periodDays }),
        });
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? "Couldn't generate insights. Please try again.");
        } else {
          setData(body as InsightsResponse);
          setGeneratedAt(new Date());
          if (mode === "refresh") toast.success("Insights refreshed.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        inFlight.current = false;
      }
    },
    [listingId],
  );

  // Auto-refresh on mount and when period changes
  useEffect(() => {
    load(data ? "refresh" : "initial", period);
    // We intentionally do not depend on `data` to avoid a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, load]);

  function handlePeriodChange(next: Period) {
    if (next === period) return;
    startTransition(() => setPeriod(next));
  }

  const containerVariants: Variants = useMemo(
    () =>
      reducedMotion
        ? {
            hidden: { opacity: 1 },
            visible: { opacity: 1, transition: { staggerChildren: 0 } },
          }
        : {
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.04, delayChildren: 0.02 },
            },
          },
    [reducedMotion],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <StickyToolbar
          period={period}
          onPeriodChange={handlePeriodChange}
          onRefresh={() => load("refresh", period)}
          refreshing={refreshing}
          loading={loading}
          generatedAt={generatedAt}
        />

        {/* ── Loading ── */}
        {loading && !data && <PanelSkeleton />}

        {/* ── Error ── */}
        {!loading && error && !data && (
          <ErrorCard
            message={error}
            onRetry={() => load("refresh", period)}
          />
        )}

        {/* ── Content ── */}
        {data && (
          <motion.div
            key={period}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "space-y-6 transition-opacity duration-150",
              refreshing && "opacity-60 pointer-events-none",
            )}
            aria-busy={refreshing}
          >
            <MetricGrid
              metrics={data.metrics.metrics}
              periodDays={data.metrics.period_days}
              reducedMotion={reducedMotion}
            />

            <SectionMotion reducedMotion={reducedMotion}>
              <PerformanceSummaryCard
                summary={data.ai.performance_summary}
              />
            </SectionMotion>

            <div className="grid gap-6 lg:grid-cols-5">
              <SectionMotion reducedMotion={reducedMotion} className="lg:col-span-2">
                <SuggestedActionsCard actions={data.ai.suggested_actions} />
              </SectionMotion>
              <SectionMotion reducedMotion={reducedMotion} className="lg:col-span-3">
                <HotBuyersCard
                  hotBuyers={data.metrics.hot_buyers}
                  listingId={listingId}
                />
              </SectionMotion>
            </div>

            <SectionMotion reducedMotion={reducedMotion}>
              <SellerUpdateCard message={data.ai.seller_update} />
            </SectionMotion>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── Sticky toolbar ─────────────────────────────────────────────────────────

function StickyToolbar({
  period,
  onPeriodChange,
  onRefresh,
  refreshing,
  loading,
  generatedAt,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  onRefresh: () => void;
  refreshing: boolean;
  loading: boolean;
  generatedAt: Date | null;
}) {
  const status = generatedAt
    ? `Updated ${fmtRelative(generatedAt)}`
    : "Generating insights…";
  return (
    <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2.5 backdrop-blur-md bg-background/85 border-b border-border/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)] shrink-0" aria-hidden />
        <span className="truncate">{status}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div
          role="group"
          aria-label="Time period"
          className="flex gap-1 rounded-lg border border-border bg-muted/50 p-0.5"
        >
          {PERIODS.map((p) => {
            const active = p.value === period;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onPeriodChange(p.value)}
                aria-pressed={active}
                disabled={loading || refreshing}
                className={cn(
                  "h-7 px-3 text-xs rounded-md transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "bg-background shadow-sm font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading || refreshing}
          aria-label={refreshing ? "Refreshing insights" : "Refresh insights"}
          className="gap-1.5 cursor-pointer"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refresh
        </Button>
      </div>
    </div>
  );
}

// ─── Metric grid ────────────────────────────────────────────────────────────

type MetricItem = {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: string;
  hint: string;
};

const MetricCard = memo(function MetricCard({ item }: { item: MetricItem }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40 cursor-help">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: `${item.accent}18`, color: item.accent }}
                aria-hidden
              >
                {item.icon}
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight flex items-center gap-1">
                {item.label}
                <Info className="h-2.5 w-2.5 opacity-50" aria-hidden />
              </p>
            </div>
            <p className="mt-2.5 text-2xl font-bold tabular-nums leading-none">
              {item.value.toLocaleString("en-AU")}
            </p>
            {item.sub && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.sub}
              </p>
            )}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {item.hint}
      </TooltipContent>
    </Tooltip>
  );
});

const MetricGrid = memo(function MetricGrid({
  metrics,
  periodDays,
  reducedMotion,
}: {
  metrics: ListingInsightsMetrics["metrics"];
  periodDays: number;
  reducedMotion: boolean;
}) {
  const items: MetricItem[] = useMemo(
    () => [
      {
        icon: <Eye className="h-4 w-4" />,
        label: "Total Views",
        value: metrics.total_views,
        sub: `Last ${periodDays} days`,
        accent: "#008F2F",
        hint: "Every time the listing page loaded in the last selected period.",
      },
      {
        icon: <Users className="h-4 w-4" />,
        label: "Unique Visitors",
        value: metrics.unique_visitors,
        sub: `Last ${periodDays} days`,
        accent: "#0ea5e9",
        hint: "Distinct buyers (by account or IP) who viewed the listing in the period.",
      },
      {
        icon: <RefreshCcw className="h-4 w-4" />,
        label: "Repeat Visitors",
        value: metrics.repeat_visitors,
        sub: `Last ${periodDays} days`,
        accent: "#f59e0b",
        hint: "Visitors who returned more than once. Strong intent signal.",
      },
      {
        icon: <MessageSquare className="h-4 w-4" />,
        label: "Enquiries",
        value: metrics.enquiries,
        sub: `Last ${periodDays} days`,
        accent: "#f59e0b",
        hint: "Buyers who submitted the enquiry form.",
      },
      {
        icon: <Phone className="h-4 w-4" />,
        label: "Calls",
        value: metrics.calls,
        sub: `Last ${periodDays} days`,
        accent: "#10b981",
        hint: "Buyers who clicked the broker call button.",
      },
      {
        icon: <ShieldQuestion className="h-4 w-4" />,
        label: "NDA Requests",
        value: metrics.nda_requests,
        sub: "All time",
        accent: "#8b5cf6",
        hint: "Distinct buyers who requested access to NDA-gated information.",
      },
      {
        icon: <ShieldCheck className="h-4 w-4" />,
        label: "NDA Signed",
        value: metrics.nda_signed,
        sub: "All time",
        accent: "#8b5cf6",
        hint: "Buyers who completed the NDA signing flow. Highest intent.",
      },
      {
        icon: <FileText className="h-4 w-4" />,
        label: "Documents Viewed",
        value: metrics.documents_viewed,
        sub: "All time",
        accent: "#6366f1",
        hint: "Approved document access requests across all buyers.",
      },
      {
        icon: <Heart className="h-4 w-4" />,
        label: "Saved Listings",
        value: metrics.saved_listings,
        sub: "All time",
        accent: "#ec4899",
        hint: "Buyers who bookmarked this listing for later.",
      },
      {
        icon: <CalendarClock className="h-4 w-4" />,
        label: "Days Live",
        value: metrics.days_live,
        sub: "Since publish",
        accent: "#0ea5e9",
        hint: "Number of days since the listing was first published.",
      },
    ],
    [metrics, periodDays],
  );

  const itemVariants: Variants = reducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
      };

  return (
    <motion.div
      variants={
        reducedMotion
          ? undefined
          : { hidden: {}, visible: { transition: { staggerChildren: 0.025 } } }
      }
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {items.map((m) => (
        <motion.div key={m.label} variants={itemVariants}>
          <MetricCard item={m} />
        </motion.div>
      ))}
    </motion.div>
  );
});

// ─── Performance summary ────────────────────────────────────────────────────

const PerformanceSummaryCard = memo(function PerformanceSummaryCard({
  summary,
}: {
  summary: string;
}) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Performance summary
        </CardTitle>
        <CardDescription className="text-xs">
          Plain-English read of the numbers above.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-[15px] leading-relaxed text-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
});

// ─── Suggested actions ─────────────────────────────────────────────────────

const SuggestedActionsCard = memo(function SuggestedActionsCard({
  actions,
}: {
  actions: string[];
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Suggested next steps</CardTitle>
        <CardDescription className="text-xs">
          Practical actions based on this listing&apos;s recent performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="space-y-2.5">
          {actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="leading-relaxed">{action}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
});

// ─── Hot buyers ─────────────────────────────────────────────────────────────

const HotBuyersCard = memo(function HotBuyersCard({
  hotBuyers,
  listingId,
}: {
  hotBuyers: HotBuyer[];
  listingId: string;
}) {
  const [activeSignals, setActiveSignals] = useState<HotBuyerSignal[]>([]);
  const [search, setSearch] = useState("");
  const [, startSearchTransition] = useTransition();
  const [deferredSearch, setDeferredSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<HotBuyerSignal, number> = {
      nda_signed: 0,
      nda_requested: 0,
      multiple_visits: 0,
      saved: 0,
    };
    for (const b of hotBuyers) for (const s of b.signals) c[s]++;
    return c;
  }, [hotBuyers]);

  const filteredBuyers = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return hotBuyers.filter((b) => {
      if (
        activeSignals.length > 0 &&
        !activeSignals.some((s) => b.signals.includes(s))
      ) {
        return false;
      }
      if (!q) return true;
      const hay =
        `${b.name ?? ""} ${b.email ?? ""} ${b.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [hotBuyers, activeSignals, deferredSearch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      startSearchTransition(() => setDeferredSearch(value));
    },
    [],
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" aria-hidden />
              Hot buyers
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {filteredBuyers.length} of {hotBuyers.length}
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Prioritise NDA-signed first. Click email or phone to reach out.
            </CardDescription>
          </div>
        </div>

        {hotBuyers.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, email, or phone"
                aria-label="Search hot buyers"
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
                value={activeSignals}
                onValueChange={(v) =>
                  setActiveSignals(v as HotBuyerSignal[])
                }
                aria-label="Filter buyers by signal"
                className="flex flex-wrap gap-1.5"
              >
                {SIGNAL_ORDER.map((sig) => {
                  const count = counts[sig];
                  const disabled = count === 0;
                  return (
                    <ToggleGroupItem
                      key={sig}
                      value={sig}
                      disabled={disabled}
                      aria-label={`${SIGNAL_LABEL[sig]} (${count})`}
                      className={cn(
                        "h-7 px-2.5 text-[11px] rounded-full border data-[state=on]:border-transparent cursor-pointer",
                        SIGNAL_ACTIVE_CLASSES[sig],
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full mr-1.5",
                          signalDotColor(sig),
                        )}
                        aria-hidden
                      />
                      {SIGNAL_LABEL[sig]}
                      <span className="ml-1.5 tabular-nums opacity-70">
                        {count}
                      </span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
              {(activeSignals.length > 0 || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveSignals([]);
                    handleSearchChange("");
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
        {hotBuyers.length === 0 ? (
          <EmptyHotBuyers />
        ) : filteredBuyers.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No buyers match your filters.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto -mx-1 px-1">
            {filteredBuyers.map((b, i) => (
              <li
                key={(b.user_id ?? b.email) ?? i}
                className="py-3.5 first:pt-1 last:pb-1"
              >
                <HotBuyerRow buyer={b} listingId={listingId} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});

const HotBuyerRow = memo(function HotBuyerRow({
  buyer,
  listingId,
}: {
  buyer: HotBuyer;
  listingId: string;
}) {
  const displayName = buyer.name?.trim() || null;
  const displayEmail = buyer.email?.trim() || null;
  const displayPhone = buyer.phone?.trim() || null;
  const initials = useMemo(
    () => getInitials(displayName, displayEmail),
    [displayName, displayEmail],
  );

  const lastActivity =
    buyer.last_activity_label && buyer.last_activity_at
      ? `${buyer.last_activity_label} · ${fmtRelative(new Date(buyer.last_activity_at))}`
      : buyer.last_seen_at
        ? `Last seen ${fmtRelative(new Date(buyer.last_seen_at))}`
        : null;

  // Sort signals by priority order so badges have a stable, meaningful order
  const orderedSignals = useMemo(
    () => SIGNAL_ORDER.filter((s) => buyer.signals.includes(s)),
    [buyer.signals],
  );

  const profileHref = buyer.user_id
    ? `/dashboard/buyers/${buyer.user_id}?listingId=${encodeURIComponent(listingId)}`
    : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between group rounded-md transition-colors duration-150 hover:bg-muted/40 -mx-2 px-2 py-1.5">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold ring-1 ring-primary/20"
          aria-hidden
        >
          {initials || <UserIcon className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          {profileHref ? (
            <Link
              href={profileHref}
              className="text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm inline-flex items-center gap-1 truncate max-w-full"
            >
              <span className="truncate">
                {displayName || displayEmail || "Anonymous buyer"}
              </span>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden />
            </Link>
          ) : (
            <p className="text-sm font-semibold truncate">
              {displayName || displayEmail || "Anonymous buyer"}
            </p>
          )}
          <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
            {displayEmail && (
              <a
                href={`mailto:${displayEmail}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Mail className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{displayEmail}</span>
              </a>
            )}
            {displayPhone && (
              <a
                href={`tel:${displayPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Phone className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{displayPhone}</span>
              </a>
            )}
            {!displayEmail && !displayPhone && (
              <span className="italic">No contact details on file</span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {[
              buyer.visit_count > 0
                ? `${buyer.visit_count} ${buyer.visit_count === 1 ? "visit" : "visits"}`
                : null,
              lastActivity,
            ]
              .filter(Boolean)
              .join(" · ") || "Activity recorded"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 sm:items-end sm:max-w-[280px]">
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {orderedSignals.map((sig) => (
            <Badge
              key={sig}
              variant="secondary"
              className={cn(
                "text-[11px] font-medium border-0 transition-transform duration-150 group-hover:translate-x-0",
                SIGNAL_TONE[sig],
              )}
            >
              {SIGNAL_LABEL[sig]}
            </Badge>
          ))}
        </div>
        {profileHref && (
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            View full profile
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
});

function EmptyHotBuyers() {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center bg-muted/30">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-medium">No hot buyers yet</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
        Returning visitors, NDA requests, signatures, and saves will appear here as buyers engage with your listing.
      </p>
    </div>
  );
}

// ─── Seller update ──────────────────────────────────────────────────────────

const SellerUpdateCard = memo(function SellerUpdateCard({
  message,
}: {
  message: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Seller update copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }, [message]);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            Seller update message
          </CardTitle>
          <CardDescription className="text-xs">
            Ready to copy and forward to your seller. Personalise the [Seller Name] placeholder before sending.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          aria-label={copied ? "Copied" : "Copy seller update"}
          className="gap-1.5 shrink-0 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </>
          )}
        </Button>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground bg-muted/40 rounded-md p-4 border">
          {message}
        </p>
      </CardContent>
    </Card>
  );
});

// ─── Loading + error states ─────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-2 p-5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-9/12" />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-8/12" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-3.5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-3.5 w-44" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-medium">Couldn&apos;t generate insights</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Section motion wrapper ────────────────────────────────────────────────

function SectionMotion({
  children,
  className,
  reducedMotion,
}: {
  children: React.ReactNode;
  className?: string;
  reducedMotion: boolean;
}) {
  const variants: Variants = reducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.2, ease: "easeOut" },
        },
      };
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(
  name: string | null,
  email: string | null,
): string | null {
  const source = (name ?? email ?? "").trim();
  if (!source) return null;
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? null;
    return (
      ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase() ||
      null
    );
  }
  return source[0]?.toUpperCase() ?? null;
}

function signalDotColor(sig: HotBuyerSignal): string {
  switch (sig) {
    case "nda_signed":
      return "bg-emerald-500";
    case "nda_requested":
      return "bg-violet-500";
    case "multiple_visits":
      return "bg-amber-500";
    case "saved":
      return "bg-pink-500";
  }
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
