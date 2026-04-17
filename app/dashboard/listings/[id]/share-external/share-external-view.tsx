"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Mail,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createExternalShareInvite } from "@/lib/actions/share-invites";

type ListingSummary = {
  id: string;
  title: string;
  slug: string;
  location_text: string | null;
  asking_price: number | null;
  price_type: string;
};

type Props = {
  listing: ListingSummary;
  ndaRequired: boolean;
};

function formatPrice(l: ListingSummary): string {
  if (l.price_type === "poa") return "Price on application";
  if (l.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(l.asking_price));
  }
  return "Price not set";
}

type LastSent = {
  email: string;
  url: string;
};

export function ShareExternalView({ listing, ndaRequired }: Props) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<LastSent | null>(null);
  const [pending, startSend] = useTransition();

  function handleSend() {
    setError(null);
    if (!recipientEmail.trim()) {
      setError("Recipient email is required.");
      return;
    }
    startSend(async () => {
      const result = await createExternalShareInvite({
        listingId: listing.id,
        recipientName,
        recipientEmail,
        customMessage,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLastSent({ email: recipientEmail.trim().toLowerCase(), url: result.url });
      setRecipientName("");
      setRecipientEmail("");
      setCustomMessage("");
      toast.success("Invite sent.");
    });
  }

  function copyLink() {
    if (!lastSent) return;
    navigator.clipboard.writeText(lastSent.url).then(() => {
      toast.success("Link copied to clipboard.");
    });
  }

  const price = formatPrice(listing);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Send listing to a new contact</h1>
          <p className="text-sm text-muted-foreground truncate max-w-xl">
            Email someone who is not yet on the platform. They will receive a
            magic link to view this listing.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Recipient
            </CardTitle>
            <CardDescription>
              {ndaRequired
                ? "They will be asked to sign your NDA before viewing the full details."
                : "They will be guided through a quick account creation step before viewing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipient-name">Name (optional)</Label>
                <Input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipient-email">Email *</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-message">Personal note (optional)</Label>
              <Textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="e.g. This matches what we discussed last week. Have a look and let me know your thoughts."
                rows={4}
                maxLength={600}
              />
              <p className="text-right text-[10px] text-muted-foreground">
                {customMessage.length} / 600
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={pending || !recipientEmail.trim()}
              className="w-full gap-2"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending invite
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send invite
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Listing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold">{listing.title}</p>
              <p className="text-xs text-muted-foreground">{price}</p>
              {listing.location_text && (
                <p className="text-xs text-muted-foreground">
                  {listing.location_text}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  {ndaRequired ? "NDA enabled for this listing" : "No NDA required"}
                </p>
                <p>
                  {ndaRequired
                    ? "Recipients will sign the NDA you configured before getting access to confidential documents."
                    : "Configure an NDA in the listing settings if you want recipients to sign one before viewing."}
                </p>
              </div>
            </div>
          </div>

          {lastSent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Invite sent
                </CardTitle>
                <CardDescription>
                  An invitation email was sent to {lastSent.email}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Magic link
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={lastSent.url}
                    className="text-xs font-mono"
                  />
                  <Button size="icon-sm" variant="outline" onClick={copyLink}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
