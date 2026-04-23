"use client";

import { useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Send,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Building2,
  CheckCheck,
  X,
  AlertTriangle,
  MailCheck,
  RefreshCw,
  MapPin,
  DollarSign,
} from "lucide-react";
import { sendMultipleListingsToContacts } from "@/lib/actions/contacts";
import type { MultiBulkSendResult } from "@/lib/actions/contacts";
import {
  TAG_COLOR_CLASSES,
  type BrokerContact,
  type ContactTag,
} from "@/lib/types/contacts";
import { cn } from "@/lib/utils";

export type BulkListingItem = {
  id: string;
  title: string;
  slug: string;
  asking_price: number | null;
  price_type: string | null;
  location_text: string | null;
};

type Props = {
  contacts: BrokerContact[];
  tags: ContactTag[];
  listings: BulkListingItem[];
};

function formatPrice(item: BulkListingItem): string | null {
  if (item.price_type === "poa") return "POA";
  if (item.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(item.asking_price));
  }
  return null;
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

export function BulkSendTab({ contacts, tags, listings }: Props) {
  // Contact filters
  const [contactSearch, setContactSearch] = useState("");
  const [contactTagFilter, setContactTagFilter] = useState<string | null>(null);
  const [contactConsentFilter, setContactConsentFilter] = useState<"all" | "yes" | "no">("all");

  // Listing filters
  const [listingSearch, setListingSearch] = useState("");

  // Selections
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());

  // Compose
  const [customMessage, setCustomMessage] = useState("");

  // Send state
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "done">("idle");
  const [sendResult, setSendResult] = useState<MultiBulkSendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // ----- Derived -----

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (contactTagFilter && !c.tags.some((t) => t.id === contactTagFilter)) return false;
      if (contactConsentFilter === "yes" && !c.consent_marketing) return false;
      if (contactConsentFilter === "no" && c.consent_marketing) return false;
      if (contactSearch.trim()) {
        const q = contactSearch.trim().toLowerCase();
        const blob = `${c.name ?? ""} ${c.email} ${c.company ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, contactSearch, contactTagFilter, contactConsentFilter]);

  const filteredListings = useMemo(() => {
    if (!listingSearch.trim()) return listings;
    const q = listingSearch.trim().toLowerCase();
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.location_text ?? "").toLowerCase().includes(q)
    );
  }, [listings, listingSearch]);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedContactIds.has(c.id)),
    [contacts, selectedContactIds]
  );
  const consentCount = selectedContacts.filter((c) => c.consent_marketing).length;
  const noConsentCount = selectedContacts.length - consentCount;
  const selectedListingCount = selectedListingIds.size;

  // ----- Handlers -----

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleListing(id: string) {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllContacts() {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      filteredContacts.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function clearContactSelection() {
    setSelectedContactIds(new Set());
  }

  function selectAllListings() {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      filteredListings.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function clearListingSelection() {
    setSelectedListingIds(new Set());
  }

  function handleReset() {
    setSendStatus("idle");
    setSendResult(null);
    setSendError(null);
    setSelectedContactIds(new Set());
    setSelectedListingIds(new Set());
    setCustomMessage("");
  }

  async function handleSend() {
    if (selectedContactIds.size === 0 || selectedListingIds.size === 0) return;
    setSendStatus("sending");
    setSendError(null);
    try {
      const result = await sendMultipleListingsToContacts(
        Array.from(selectedListingIds),
        Array.from(selectedContactIds),
        customMessage.trim() || undefined
      );
      setSendResult(result);
      setSendStatus("done");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "An unexpected error occurred");
      setSendStatus("idle");
    }
  }

  // ----- Results view -----
  if (sendStatus === "done" && sendResult) {
    return <SendResults result={sendResult} onReset={handleReset} />;
  }

  const canSend = selectedContactIds.size > 0 && selectedListingIds.size > 0 && consentCount > 0;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            Select contacts and listings below, add an optional message, then send. Each
            eligible contact receives <strong>one email</strong> containing all selected listings.
          </p>
        </div>
        {sendStatus === "sending" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending — please wait&hellip;
          </div>
        )}
      </div>

      {/* Two-panel: contacts + listings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Contacts ── */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  1. Select Recipients
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {contacts.length} total &middot;{" "}
                  <span className="font-medium text-foreground">
                    {selectedContactIds.size} selected
                  </span>
                  {noConsentCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-1">
                      ({noConsentCount} will be skipped — no consent)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={selectAllContacts}
                  disabled={filteredContacts.length === 0}
                >
                  <CheckCheck className="h-3 w-3" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={clearContactSelection}
                  disabled={selectedContactIds.size === 0}
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Select
                value={contactConsentFilter}
                onValueChange={(v) =>
                  setContactConsentFilter(v as typeof contactConsentFilter)
                }
              >
                <SelectTrigger size="sm" className="w-36 text-xs h-8 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Consent given</SelectItem>
                  <SelectItem value="no">No consent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tag chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setContactTagFilter(
                        contactTagFilter === tag.id ? null : tag.id
                      )
                    }
                    className={cn(
                      "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium transition",
                      contactTagFilter === tag.id
                        ? TAG_COLOR_CLASSES[tag.color]
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
                {contactTagFilter && (
                  <button
                    type="button"
                    onClick={() => setContactTagFilter(null)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-2.5 w-2.5" /> Clear tag
                  </button>
                )}
              </div>
            )}
          </CardHeader>

          <div className="overflow-y-auto max-h-80">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground px-4">
                <Search className="h-6 w-6" />
                No contacts match your filter
              </div>
            ) : (
              <ul className="divide-y">
                {filteredContacts.map((c) => {
                  const isSelected = selectedContactIds.has(c.id);
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/40 sm:px-5",
                        isSelected && "bg-primary/5 hover:bg-primary/10"
                      )}
                      onClick={() => toggleContact(c.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleContact(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                          {getInitials(c.name, c.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {c.name || c.email}
                        </p>
                        {c.name && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.email}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {c.consent_marketing ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] gap-0.5 py-0 border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-300"
                          >
                            <ShieldCheck className="h-2 w-2" />
                            OK
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] gap-0.5 py-0 border-amber-200 text-amber-700 dark:border-amber-900/50 dark:text-amber-400"
                          >
                            <ShieldOff className="h-2 w-2" />
                            Skip
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* ── Listings ── */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  2. Select Listings
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {listings.length} published &middot;{" "}
                  <span className="font-medium text-foreground">
                    {selectedListingCount} selected
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={selectAllListings}
                  disabled={filteredListings.length === 0}
                >
                  <CheckCheck className="h-3 w-3" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={clearListingSelection}
                  disabled={selectedListingIds.size === 0}
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listings"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </CardHeader>

          <div className="overflow-y-auto max-h-80">
            {listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground px-4">
                <Building2 className="h-6 w-6" />
                <p>No published listings found.</p>
                <p className="text-xs">
                  Publish a listing first to include it in bulk sends.
                </p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground px-4">
                <Search className="h-6 w-6" />
                No listings match your search
              </div>
            ) : (
              <ul className="divide-y">
                {filteredListings.map((l) => {
                  const isSelected = selectedListingIds.has(l.id);
                  const price = formatPrice(l);
                  return (
                    <li
                      key={l.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/40 sm:px-5",
                        isSelected && "bg-primary/5 hover:bg-primary/10"
                      )}
                      onClick={() => toggleListing(l.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleListing(l.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{l.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {price && (
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <DollarSign className="h-2.5 w-2.5" />
                              {price}
                            </span>
                          )}
                          {l.location_text && (
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5" />
                              {l.location_text}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Message + Send */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-message">
              3. Personal message{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bulk-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a short personal note shown at the top of the email — e.g. 'Hi, I thought these might suit your criteria. Let me know if you'd like more info!'"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Summary */}
          <SendSummary
            selectedContacts={selectedContacts.length}
            consentCount={consentCount}
            noConsentCount={noConsentCount}
            selectedListings={selectedListingCount}
          />

          {sendError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {sendError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Contacts without marketing consent are automatically skipped.
            </p>
            <Button
              onClick={handleSend}
              disabled={!canSend || sendStatus === "sending"}
              className="gap-2 shrink-0"
            >
              {sendStatus === "sending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending&hellip;
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Emails
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SendSummary({
  selectedContacts,
  consentCount,
  noConsentCount,
  selectedListings,
}: {
  selectedContacts: number;
  consentCount: number;
  noConsentCount: number;
  selectedListings: number;
}) {
  if (selectedContacts === 0 && selectedListings === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <p className="text-xs font-semibold text-foreground">Summary</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedListings}</span>{" "}
          listing{selectedListings !== 1 ? "s" : ""} selected
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedContacts}</span>{" "}
          contact{selectedContacts !== 1 ? "s" : ""} selected
        </span>
        <span className="text-xs text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="inline h-3 w-3 mr-0.5" />
          <span className="font-medium">{consentCount}</span>{" "}
          will receive email
        </span>
        {noConsentCount > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="inline h-3 w-3 mr-0.5" />
            <span className="font-medium">{noConsentCount}</span> will be skipped
          </span>
        )}
      </div>
      {selectedListings > 0 && consentCount > 0 && (
        <p className="text-xs text-muted-foreground pt-0.5 border-t mt-1.5">
          = <span className="font-medium text-foreground">{consentCount}</span>{" "}
          email{consentCount !== 1 ? "s" : ""} will be sent, each containing{" "}
          <span className="font-medium text-foreground">{selectedListings}</span>{" "}
          listing{selectedListings !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function SendResults({
  result,
  onReset,
}: {
  result: MultiBulkSendResult;
  onReset: () => void;
}) {
  const hasIssues = result.skipped.length > 0 || result.failed.length > 0;

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-full p-2",
              result.sent > 0 ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-amber-100 dark:bg-amber-950/40"
            )}
          >
            {result.sent > 0 ? (
              <MailCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <CardTitle className="text-base">
              {result.sent > 0
                ? `${result.sent} email${result.sent !== 1 ? "s" : ""} sent successfully`
                : "No emails were sent"}
            </CardTitle>
            <CardDescription>
              {result.listingsFound} listing{result.listingsFound !== 1 ? "s" : ""} included in each email
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill
            label="Sent"
            value={result.sent}
            color="emerald"
          />
          <StatPill
            label="Skipped"
            value={result.skipped.length}
            color={result.skipped.length > 0 ? "amber" : "muted"}
          />
          <StatPill
            label="Failed"
            value={result.failed.length}
            color={result.failed.length > 0 ? "rose" : "muted"}
          />
        </div>

        {/* Skipped details */}
        {result.skipped.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Skipped contacts
            </p>
            <div className="rounded-md border border-amber-200 dark:border-amber-900/40 divide-y divide-amber-100 dark:divide-amber-900/30 text-xs overflow-hidden">
              {result.skipped.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/50 dark:bg-amber-950/20">
                  <span className="truncate text-muted-foreground font-medium">
                    {s.email || s.contactId}
                  </span>
                  <span className="ml-auto shrink-0 text-amber-700 dark:text-amber-400">
                    {s.reason}
                  </span>
                </div>
              ))}
              {result.skipped.length > 10 && (
                <div className="px-3 py-1.5 text-muted-foreground bg-amber-50/50 dark:bg-amber-950/20">
                  + {result.skipped.length - 10} more skipped
                </div>
              )}
            </div>
          </div>
        )}

        {/* Failed details */}
        {result.failed.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Failed sends
            </p>
            <div className="rounded-md border border-rose-200 dark:border-rose-900/40 divide-y divide-rose-100 dark:divide-rose-900/30 text-xs overflow-hidden">
              {result.failed.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50/50 dark:bg-rose-950/20">
                  <span className="truncate text-muted-foreground font-medium">{f.email}</span>
                  <span className="ml-auto shrink-0 text-rose-600 dark:text-rose-400">{f.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasIssues && (
          <p className="text-sm text-muted-foreground">
            All selected contacts with marketing consent received the email.
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Send another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose" | "muted";
}) {
  const colors = {
    emerald:
      "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300",
    amber:
      "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300",
    rose: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-300",
    muted: "bg-muted border-border text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 text-center", colors[color])}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-[11px] mt-1 font-medium">{label}</p>
    </div>
  );
}
