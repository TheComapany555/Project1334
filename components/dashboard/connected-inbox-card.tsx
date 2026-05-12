"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Unplug,
  ShieldCheck,
} from "lucide-react";
import {
  disconnectInbox,
  getConnectedEmailAccount,
  isConnectedInboxEnabled,
  type ConnectedEmailAccount,
} from "@/lib/actions/email-accounts";
import { cn } from "@/lib/utils";

/**
 * Card on the broker's profile page that lets them connect / disconnect a
 * Gmail account. When connected, every email sent via the in-app composer
 * goes through their Gmail (lands in their Sent folder, replies thread
 * naturally). When not connected, the composer falls back to Resend.
 */
export function ConnectedInboxCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [account, setAccount] = useState<ConnectedEmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [disconnecting, setDisconnecting] = useState(false);

  // Initial load.
  useEffect(() => {
    let mounted = true;
    Promise.all([isConnectedInboxEnabled(), getConnectedEmailAccount()])
      .then(([on, acc]) => {
        if (!mounted) return;
        setEnabled(on);
        setAccount(acc);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Surface OAuth callback outcomes.
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("connect_error");
    if (connected === "gmail") {
      toast.success("Gmail connected — emails now send from your inbox.");
      // The card mounted BEFORE the OAuth round-trip, so its initial fetch
      // returned null. Re-fetch now that we know the DB row exists.
      getConnectedEmailAccount()
        .then((acc) => setAccount(acc))
        .catch(() => {});
      // Drop the query param so the toast doesn't refire on subsequent renders.
      router.replace(window.location.pathname, { scroll: false });
    } else if (error) {
      toast.error(
        error === "not_configured"
          ? "Connected Inbox isn't set up on this server yet."
          : error === "state_mismatch"
            ? "Connection cancelled (security check failed)."
            : error === "missing_refresh_token"
              ? "Couldn't get long-term access. Please try again."
              : `Couldn't connect Gmail: ${decodeURIComponent(error)}`,
      );
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    const res = await disconnectInbox("gmail");
    setDisconnecting(false);
    if (res.ok) {
      setAccount(null);
      toast.success("Gmail disconnected");
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error);
    }
  };

  // Skeleton while loading
  if (loading) {
    return (
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Connected inbox
          </CardTitle>
          <CardDescription>
            Send emails from your real Gmail account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-16 rounded-md bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Not configured at platform level.
  if (!enabled) {
    return (
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Connected inbox
          </CardTitle>
          <CardDescription>
            Send Salebiz emails from your real Gmail or Outlook account so they
            land in your own Sent folder and replies thread to your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Not configured on this server yet. Ask your Salebiz admin to set
            <code className="mx-1 px-1 py-0.5 bg-background rounded text-xs">
              GOOGLE_CLIENT_ID
            </code>
            +{" "}
            <code className="mx-1 px-1 py-0.5 bg-background rounded text-xs">
              GOOGLE_CLIENT_SECRET
            </code>
            +{" "}
            <code className="mx-1 px-1 py-0.5 bg-background rounded text-xs">
              EMAIL_TOKEN_ENCRYPTION_KEY
            </code>
            .
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected
  if (account && account.status === "active") {
    return (
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Connected inbox
          </CardTitle>
          <CardDescription>
            Emails sent from Salebiz go through your Gmail, appear in your Sent
            folder, and replies arrive in your normal inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4 flex items-start gap-3">
            <div className="rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 p-2 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">
                  {account.display_name ?? "Gmail"}
                </p>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  {account.provider === "gmail" ? "Gmail" : "Outlook"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {account.email_address}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Connected {fmtDate(account.connected_at)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Disconnect
            </Button>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
              Emails come from {account.email_address} — buyers see your real
              address, not a Salebiz address.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
              Replies arrive in your Gmail inbox like any other email.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
              Auto-logged to your CRM timeline.
            </li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  // Error state on existing account
  if (account && account.status !== "active") {
    return (
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Connected inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-orange-300 bg-orange-50/30 dark:border-orange-900/60 dark:bg-orange-950/20 p-3 flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-orange-700 dark:text-orange-300 mt-0.5 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="font-medium text-orange-900 dark:text-orange-200">
                Connection broken — please reconnect.
              </p>
              {account.last_error && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {account.last_error}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <a href="/api/auth/google/connect">
                <Mail className="h-3.5 w-3.5" />
                Reconnect Gmail
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              Remove connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected — show CTA
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Connected inbox
        </CardTitle>
        <CardDescription>
          Send Salebiz emails from your real Gmail account so they land in your
          own Sent folder and replies thread naturally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-border bg-muted/10 p-4 flex items-center gap-3">
          <div className="rounded-md bg-muted p-2 shrink-0">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Not connected yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sends fall back to{" "}
              <code className="text-[10px]">noreply@salebiz.com.au</code> with
              your address as Reply-To.
            </p>
          </div>
          <Button size="sm" asChild>
            <a
              href="/api/auth/google/connect"
              className="inline-flex items-center"
            >
              <GoogleGlyph className="h-3.5 w-3.5" />
              Connect Gmail
            </a>
          </Button>
        </div>

        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckIcon /> One-click setup. We only request permission to
            <strong className="font-medium mx-1">send mail</strong> on your
            behalf — not read your inbox.
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon /> Emails appear to come from you, not Salebiz.
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon /> Disconnect anytime — no data deleted, just stops
            sending through your account.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function CheckIcon() {
  return (
    <CheckCircle2 className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
  );
}

// Minimal Google "G" mark (inline SVG, no extra asset)
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={cn(className)}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.614z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
