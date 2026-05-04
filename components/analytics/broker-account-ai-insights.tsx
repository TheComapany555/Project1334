"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AIListingInsights } from "@/lib/ai/listing-insights";

type Props = {
  periodDays: 7 | 30 | 90;
};

export function BrokerAccountAiInsights({ periodDays }: Props) {
  const [data, setData] = useState<AIListingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refInFlight = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (refInFlight.current) return;
      refInFlight.current = true;
      if (mode === "initial") {
        setLoading(true);
        setData(null);
      } else setRefreshing(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/broker/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period_days: periodDays }),
        });
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? "Could not generate AI insight.");
          setData(null);
        } else {
          setData(body.ai as AIListingInsights);
          if (mode === "refresh") toast.success("AI insight refreshed.");
        }
      } catch {
        setError("Network error. Please try again.");
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
        refInFlight.current = false;
      }
    },
    [periodDays],
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  if (loading && !data) {
    return (
      <Card id="broker-account-ai-insight" className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card id="broker-account-ai-insight" className="border-destructive/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI insight
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={() => load("refresh")}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card
      id="broker-account-ai-insight"
      className={`${refreshing ? "opacity-70 pointer-events-none" : ""}`}
    >
      <CardHeader className="pb-2 flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI insight
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Portfolio view for your whole account (matches the period above).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={refreshing}
          onClick={() => load("refresh")}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
            Summary
          </p>
          <p className="text-foreground leading-relaxed">{data.performance_summary}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
            Suggested next steps
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground">
            {data.suggested_actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ready-to-use update
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-xs shrink-0"
              onClick={async () => {
                await navigator.clipboard.writeText(data.seller_update);
                toast.success("Copied to clipboard.");
              }}
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {data.seller_update}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
