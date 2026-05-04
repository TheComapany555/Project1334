"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  Eye,
  MessageSquare,
  Heart,
  FileSignature,
  Clock,
  TrendingUp,
  Smartphone,
  Globe,
  Phone,
  Sparkles,
} from "lucide-react";
import type { AnalyticsOverview } from "@/lib/actions/analytics";
import { BrokerAccountAiInsights } from "@/components/analytics/broker-account-ai-insights";

const C_PRIMARY = "#008F2F";
const C_MOBILE = "#16a34a";
const C_ENQUIRY = "#f59e0b";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(secs: number | null): string {
  if (secs == null || secs === 0) return "0s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtDate(iso: string, showYear = false): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    ...(showYear && { year: "2-digit" }),
  });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Trend pill ──────────────────────────────────────────────────────────────

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {Math.abs(pct)}% vs prev period
    </span>
  );
}

// ─── Horizontal mini-bar ─────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  trend,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: number | null;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: accent ? `${accent}18` : undefined }}
          >
            <span style={{ color: accent ?? "hsl(var(--muted-foreground))" }}>{icon}</span>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground leading-none">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          {trend !== undefined && (
            <div className="mt-2">
              <TrendBadge pct={trend ?? null} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart wrapper (fixes dark-mode SVG text color) ──────────────────────────
// recharts sets tick fill as an SVG presentation attribute which cannot resolve
// CSS variables. Wrapping in a div with `text-muted-foreground` + the CSS
// class-selector override forces `fill: currentColor` which inherits correctly.
function ChartWrapper({ children, height }: { children: React.ReactNode; height: number }) {
  return (
    <div
      className={`text-muted-foreground [&_.recharts-cartesian-axis-tick_text]:fill-current [&_.recharts-legend-item-text]:fill-current`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg text-sm">
      <p className="font-medium text-popover-foreground mb-1.5">{label ? fmtDate(label) : ""}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="ml-auto pl-4 font-semibold tabular-nums text-popover-foreground">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Period tabs ─────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  initialData: AnalyticsOverview;
}

export function AnalyticsDashboard({ initialData }: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(
    initialData.period_days as 7 | 30 | 90
  );
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function changePeriod(days: 7 | 30 | 90) {
    if (days === period) return;
    setPeriod(days);
    setLoading(true);
    const { getBrokerAnalytics } = await import("@/lib/actions/analytics");
    const result = await getBrokerAnalytics(days);
    setData(result);
    setLoading(false);
  }

  const maxViews = Math.max(...data.per_listing.map((r) => r.views), 1);
  const maxEnquiries = Math.max(...data.per_listing.map((r) => r.enquiries), 1);

  const platformShare =
    data.total_views > 0
      ? Math.round((data.web_views / data.total_views) * 100)
      : 0;

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>

      {/* ── Period selector ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Listing Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance across web and mobile for the selected period.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              onClick={() => changePeriod(p.value as 7 | 30 | 90)}
              className={`h-7 px-3 text-xs rounded-md transition-all ${
                period === p.value
                  ? "bg-background shadow-sm font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <BrokerAccountAiInsights periodDays={period} />

      {/* ── KPI row ── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<Eye className="h-4 w-4" />}
          label="Total Views"
          value={fmtNum(data.total_views)}
          sub={`${data.period_days}-day window`}
          trend={data.views_trend}
          accent={C_PRIMARY}
        />
        <KpiCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Enquiries"
          value={fmtNum(data.enquiries)}
          sub={`${data.period_days}-day window`}
          trend={data.enquiries_trend}
          accent={C_ENQUIRY}
        />
        <KpiCard
          icon={<Phone className="h-4 w-4" />}
          label="Calls"
          value={fmtNum(data.calls)}
          sub={`${data.calls_total} all time`}
          accent="#10b981"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Engagement"
          value={`${data.engagement_rate}%`}
          sub="enquiries per 100 views"
          accent="#6366f1"
        />
        <KpiCard
          icon={<Heart className="h-4 w-4" />}
          label="Saves"
          value={fmtNum(data.saves_total)}
          sub="all time"
          accent="#ec4899"
        />
        <KpiCard
          icon={<FileSignature className="h-4 w-4" />}
          label="NDA Signatures"
          value={fmtNum(data.nda_sigs_total)}
          sub="all time"
          accent="#8b5cf6"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Time on Page"
          value={fmtDuration(data.avg_duration_seconds)}
          sub="with tracking active"
          accent="#0ea5e9"
        />
      </div>

      {data.total_views === 0 && data.enquiries === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Eye className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              Views and enquiries will appear here once buyers start visiting your listings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Charts row ── */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Views + Enquiries area chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-0 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Views and Enquiries</CardTitle>
                  <span className="text-xs text-muted-foreground">Last {data.period_days} days</span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 px-2 pb-3">
                <ChartWrapper height={240}>
                  <AreaChart
                    data={data.daily}
                    margin={{ top: 4, right: 12, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gWeb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C_PRIMARY} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C_MOBILE} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={C_MOBILE} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gEnq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C_ENQUIRY} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C_ENQUIRY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => fmtDate(d)}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={data.period_days <= 7 ? 0 : "preserveStartEnd"}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(v) =>
                        v === "web" ? "Web views" : v === "mobile" ? "Mobile views" : "Enquiries"
                      }
                    />
                    <Area type="monotone" dataKey="web" name="web" stroke={C_PRIMARY} strokeWidth={1.5} fill="url(#gWeb)" dot={false} />
                    <Area type="monotone" dataKey="mobile" name="mobile" stroke={C_MOBILE} strokeWidth={1.5} fill="url(#gMobile)" dot={false} />
                    <Area type="monotone" dataKey="enquiries" name="enquiries" stroke={C_ENQUIRY} strokeWidth={1.5} fill="url(#gEnq)" dot={false} />
                  </AreaChart>
                </ChartWrapper>
              </CardContent>
            </Card>

            {/* Platform split + engagement */}
            <div className="flex flex-col gap-4">
              <Card className="flex-1">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold">Platform Split</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" /> Web
                      </span>
                      <span className="font-semibold tabular-nums">{data.web_views}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${platformShare}%`, background: C_PRIMARY }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground mt-0.5">{platformShare}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Smartphone className="h-3.5 w-3.5" /> Mobile
                      </span>
                      <span className="font-semibold tabular-nums">{data.mobile_views}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${100 - platformShare}%`, background: C_MOBILE }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground mt-0.5">{100 - platformShare}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold">Engagement Funnel</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {[
                    { label: "Views", value: data.total_views, color: C_PRIMARY },
                    { label: "Saves", value: data.saves_total, color: "#ec4899" },
                    { label: "Enquiries", value: data.enquiries, color: C_ENQUIRY },
                    { label: "Calls", value: data.calls_total, color: "#10b981" },
                    { label: "NDA signed", value: data.nda_sigs_total, color: "#8b5cf6" },
                  ].map((row) => {
                    const pct =
                      data.total_views > 0
                        ? Math.min(100, (row.value / data.total_views) * 100)
                        : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-semibold tabular-nums">{row.value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: row.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Daily enquiries bar chart ── */}
          {data.enquiries > 0 && (
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Daily Enquiries</CardTitle>
                  <span className="text-xs text-muted-foreground">Last {data.period_days} days</span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 px-2 pb-3">
                <ChartWrapper height={140}>
                  <BarChart
                    data={data.daily}
                    margin={{ top: 2, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => fmtDate(d)}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="enquiries" name="enquiries" fill={C_ENQUIRY} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartWrapper>
              </CardContent>
            </Card>
          )}

          {/* ── Per-listing performance table ── */}
          {data.per_listing.length > 0 && (
            <Card>
              <CardHeader className="pt-5 pb-0 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Listing Performance</CardTitle>
                  <span className="text-xs text-muted-foreground">All time</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border bg-muted/40">
                        <th className="text-left pl-5 pr-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Listing
                        </th>
                        <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[1%] whitespace-nowrap">
                          AI insight
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Views
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                          Web / Mobile
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Enquiries
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                          Saves
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                          NDA Signed
                        </th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                          Avg Time
                        </th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Engagement
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.per_listing.map((row, idx) => (
                        <tr
                          key={row.listing_id}
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <td className="pl-5 pr-3 py-3.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                                {idx + 1}
                              </span>
                              <span className="truncate font-medium text-foreground max-w-[160px]">
                                {row.title}
                              </span>
                              {row.slug && (
                                <Link
                                  href={`/listing/${row.slug}`}
                                  target="_blank"
                                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-3.5">
                            <Link
                              href={`/dashboard/listings/${row.listing_id}/insights?from=analytics`}
                              className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                            >
                              Open
                            </Link>
                          </td>
                          <td className="px-3 py-3.5">
                            <MiniBar value={row.views} max={maxViews} color={C_PRIMARY} />
                          </td>
                          <td className="px-3 py-3.5 hidden md:table-cell">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <Globe className="h-3 w-3" />
                                {row.web_views}
                              </span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="flex items-center gap-0.5">
                                <Smartphone className="h-3 w-3" />
                                {row.mobile_views}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <MiniBar value={row.enquiries} max={maxEnquiries} color={C_ENQUIRY} />
                          </td>
                          <td className="px-3 py-3.5 hidden lg:table-cell">
                            <span className="tabular-nums text-sm text-foreground">{row.saves}</span>
                          </td>
                          <td className="px-3 py-3.5 hidden lg:table-cell">
                            <span className="tabular-nums text-sm text-foreground">{row.nda_sigs}</span>
                          </td>
                          <td className="px-3 py-3.5 text-sm text-muted-foreground hidden xl:table-cell">
                            {fmtDuration(row.avg_duration)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className={`inline-block tabular-nums text-xs font-semibold px-2 py-0.5 rounded-full ${
                                row.engagement_rate > 5
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : row.engagement_rate > 0
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {row.engagement_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {data.per_listing.length > 0 && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() =>
                  document
                    .getElementById("broker-account-ai-insight")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Sparkles className="h-4 w-4" />
                AI insight
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
