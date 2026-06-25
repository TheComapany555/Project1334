"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  connectAgentbox,
  disconnectAgentbox,
  syncAgentboxListings,
  testAgentboxConnection,
} from "@/lib/actions/agentbox";
import type {
  AgentboxConnectionStatus,
  AgentboxConnectionView,
  AgentboxSyncResult,
} from "@/lib/agentbox-sync-shared";

const STATUS_META: Record<
  AgentboxConnectionStatus,
  { label: string; className: string }
> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  pending_ip_whitelist: {
    label: "Pending IP whitelisting",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  },
  disconnected: {
    label: "Disconnected",
    className: "bg-muted text-muted-foreground",
  },
  not_connected: {
    label: "Not connected",
    className: "bg-muted text-muted-foreground",
  },
};

function summarise(r: AgentboxSyncResult): string {
  const parts: string[] = [];
  if (r.created) parts.push(`${r.created} created`);
  if (r.updated) parts.push(`${r.updated} updated`);
  if (r.imagesAdded) parts.push(`${r.imagesAdded} images`);
  if (r.skipped) parts.push(`${r.skipped} skipped`);
  if (r.imageFailures) parts.push(`${r.imageFailures} images failed`);
  return parts.join(" · ") || "Nothing to import";
}

export function AgentboxConnectCard({ initialView }: { initialView: AgentboxConnectionView }) {
  const router = useRouter();
  const [view, setView] = useState<AgentboxConnectionView>(initialView);
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, startBusy] = useTransition();

  const isConnectedish = view.status === "connected" || view.status === "pending_ip_whitelist" || view.status === "error";
  const statusMeta = STATUS_META[view.status];

  function handleConnect() {
    if (!clientId.trim() || !apiKey.trim()) {
      toast.error("Enter both the Client ID and API Key.");
      return;
    }
    startBusy(async () => {
      const res = await connectAgentbox({ clientId, apiKey });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setView(res.view);
      setClientId("");
      setApiKey("");
      toast.success(
        res.view.status === "connected"
          ? "Agentbox connected."
          : "Saved. Awaiting IP whitelisting before we can reach Agentbox.",
      );
      router.refresh();
    });
  }

  function handleTest() {
    startBusy(async () => {
      const res = await testAgentboxConnection();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setView(res.view);
      toast[res.view.status === "connected" ? "success" : "message"](
        res.view.status === "connected" ? "Connection OK." : statusMeta.label,
        { description: res.view.lastError ?? undefined },
      );
      router.refresh();
    });
  }

  function handleSync() {
    startBusy(async () => {
      const res = await syncAgentboxListings();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Agentbox sync complete", {
        description: summarise(res.result) + ". Imported as drafts.",
      });
      // Refresh the connection view (last synced / result) from the server.
      const refreshed = await testAgentboxConnection().catch(() => null);
      if (refreshed?.ok) setView(refreshed.view);
      router.refresh();
    });
  }

  function handleDisconnect() {
    startBusy(async () => {
      const res = await disconnectAgentbox();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setView(res.view);
      toast.success("Agentbox disconnected.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <PlugZap className="size-5" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">Agentbox (Reapit Sales)</CardTitle>
              <CardDescription className="text-sm">
                Pull your Agentbox listings into SaleBiz as drafts you review and publish.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className={statusMeta.className}>
            {statusMeta.label}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-5 pt-5">
        {/* No agency — per-agency feature not available */}
        {!view.hasAgency && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              Agentbox connects at the <strong>agency</strong> level. Your account isn&apos;t part of an
              agency, so there&apos;s nothing to configure here.
            </span>
          </div>
        )}

        {/* In an agency but not the owner — read-only */}
        {view.hasAgency && !view.canManage && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              Your agency&apos;s Agentbox connection is managed by the agency owner. Current status:{" "}
              <strong>{statusMeta.label}</strong>.
            </span>
          </div>
        )}

        {/* Owner, but encryption key not configured */}
        {view.hasAgency && view.canManage && !view.configured && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Credential encryption isn&apos;t configured yet. Ask an administrator to set{" "}
              <code>INTEGRATION_ENCRYPTION_KEY</code> before connecting.
            </span>
          </div>
        )}

        {/* Owner + configured: connect form OR connection details */}
        {view.hasAgency && view.canManage && view.configured && (
          <>
            {view.status === "pending_ip_whitelist" && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Credentials are saved but we can&apos;t reach Agentbox yet — its API is restricted to
                  whitelisted IP addresses. Ask Reapit to whitelist our server IP, then click{" "}
                  <strong>Test connection</strong>.
                  {view.lastError && (
                    <span className="mt-1.5 block font-mono text-[11px] opacity-90">
                      {view.lastError}
                    </span>
                  )}
                </span>
              </div>
            )}

            {view.lastError && view.status === "error" && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{view.lastError}</span>
              </div>
            )}

            {isConnectedish ? (
              <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Client ID</dt>
                    <dd className="font-mono">{view.clientIdMasked ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Last synced</dt>
                    <dd>
                      {view.lastSyncedAt
                        ? new Date(view.lastSyncedAt).toLocaleString("en-AU")
                        : "Never"}
                    </dd>
                  </div>
                </dl>

                {view.lastSyncResult && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {summarise(view.lastSyncResult)} (of {view.lastSyncResult.total}).
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleSync}
                    disabled={busy || view.status !== "connected"}
                    className="gap-1.5"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Sync now
                  </Button>
                  <Button type="button" variant="outline" onClick={handleTest} disabled={busy} className="gap-1.5">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Test connection
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDisconnect}
                    disabled={busy}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Unplug className="size-4" />
                    Disconnect
                  </Button>
                </div>
                {view.status !== "connected" && (
                  <p className="text-xs text-muted-foreground">
                    Sync is available once the connection is verified.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="agentbox-client-id">Client ID</Label>
                    <Input
                      id="agentbox-client-id"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Your Agentbox Client ID"
                      autoComplete="off"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agentbox-api-key">API Key</Label>
                    <Input
                      id="agentbox-api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Your Agentbox API Key"
                      autoComplete="off"
                      disabled={busy}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Find these in your Agentbox account (or from Reapit). Stored encrypted; only the
                  agency owner can manage this connection.
                </p>
                <Button type="button" onClick={handleConnect} disabled={busy} className="gap-1.5">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                  Connect Agentbox
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
