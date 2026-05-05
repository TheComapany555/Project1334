"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Search,
  X,
  Mail,
  ShieldOff,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sendListingToContacts } from "@/lib/actions/contacts";
import {
  TAG_COLOR_CLASSES,
  type BrokerContact,
  type ContactTag,
} from "@/lib/types/contacts";
import { cn } from "@/lib/utils";
import { AITextActions } from "@/components/ai/ai-text-actions";

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
  contacts: BrokerContact[];
  tags: ContactTag[];
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

type LastResult = {
  sent: number;
  skipped: { email: string; reason: string }[];
  failed: { email: string; error: string }[];
};

export function ShareListingView({ listing, contacts, tags }: Props) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [consentOnly, setConsentOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [sending, startSend] = useTransition();

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (consentOnly && !c.consent_marketing) return false;
      if (tagFilter && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const blob = `${c.name ?? ""} ${c.email} ${c.company ?? ""} ${c.interest ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, consentOnly, tagFilter, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someFilteredSelected = filtered.some((c) => selectedIds.has(c.id));

  function toggleAllFiltered() {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      filtered.forEach((c) => next.delete(c.id));
    } else {
      filtered.forEach((c) => {
        if (c.consent_marketing) next.add(c.id);
      });
    }
    setSelectedIds(next);
  }

  function toggleOne(c: BrokerContact) {
    if (!c.consent_marketing) return;
    const next = new Set(selectedIds);
    if (next.has(c.id)) next.delete(c.id);
    else next.add(c.id);
    setSelectedIds(next);
  }

  const selectedCount = selectedIds.size;
  const price = formatPrice(listing);

  function handleSend() {
    if (selectedCount === 0) return;
    setLastResult(null);
    startSend(async () => {
      const result = await sendListingToContacts(
        listing.id,
        Array.from(selectedIds),
        customMessage.trim() || undefined
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setLastResult({
        sent: result.sent,
        skipped: result.skipped.map((s) => ({ email: s.email, reason: s.reason })),
        failed: result.failed.map((f) => ({ email: f.email, error: f.error })),
      });

      if (result.sent > 0) {
        toast.success(`Sent to ${result.sent} contact${result.sent === 1 ? "" : "s"}.`);
        setSelectedIds(new Set());
        setCustomMessage("");
      } else if (result.failed.length > 0) {
        toast.error(`Failed to send to ${result.failed.length} contact(s).`);
      } else {
        toast.info("No contacts were eligible to send to.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Share listing by email</h1>
          <p className="text-sm text-muted-foreground truncate max-w-xl">
            Select contacts to email this listing to. Contacts without marketing
            consent are skipped automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: contact picker */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm">Recipients</CardTitle>
                <CardDescription>
                  {selectedCount === 0
                    ? `${filtered.length} shown, none selected`
                    : `${selectedCount} selected of ${filtered.length} shown`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleAllFiltered}
                  disabled={filtered.length === 0}
                >
                  {allFilteredSelected ? "Clear selection" : "Select all shown"}
                </Button>
              </div>
            </CardHeader>

            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center">
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, company, interest"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={consentOnly}
                  onCheckedChange={(v) => setConsentOnly(v === true)}
                />
                Only contacts with consent
              </label>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {tags.length > 0 &&
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setTagFilter(tagFilter === tag.id ? null : tag.id)
                      }
                      className={cn(
                        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium transition",
                        tagFilter === tag.id
                          ? TAG_COLOR_CLASSES[tag.color]
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                {(search || tagFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => {
                      setTagFilter(null);
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
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-medium">
                      {contacts.length === 0
                        ? "You have no contacts yet"
                        : "No contacts match the filter"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contacts.length === 0
                        ? "Save enquiries or add contacts manually to share listings."
                        : "Try clearing the search or uncheck the consent filter."}
                    </p>
                  </div>
                  {contacts.length === 0 && (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/contacts">Go to CRM</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={
                            allFilteredSelected
                              ? true
                              : someFilteredSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleAllFiltered}
                          aria-label="Select all visible contacts"
                        />
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="hidden md:table-cell">Tags</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Interest
                      </TableHead>
                      <TableHead className="pr-4">Consent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const disabled = !c.consent_marketing;
                      const checked = selectedIds.has(c.id);
                      return (
                        <TableRow
                          key={c.id}
                          className={cn(
                            disabled ? "opacity-60" : "cursor-pointer",
                            checked && "bg-muted/40"
                          )}
                          onClick={() => toggleOne(c)}
                        >
                          <TableCell className="pl-4 py-3 align-top">
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() => toggleOne(c)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${c.name ?? c.email}`}
                            />
                          </TableCell>
                          <TableCell className="py-3 align-top">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                  {getInitials(c.name, c.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {c.name || c.email}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-3 align-top">
                            {c.tags.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                No tags
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {c.tags.map((t) => (
                                  <Badge
                                    key={t.id}
                                    variant="outline"
                                    className={cn(
                                      "text-[10px]",
                                      TAG_COLOR_CLASSES[t.color]
                                    )}
                                  >
                                    {t.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell py-3 align-top max-w-[220px]">
                            <p className="text-xs text-muted-foreground truncate">
                              {c.interest || "Not specified"}
                            </p>
                          </TableCell>
                          <TableCell className="pr-4 py-3 align-top">
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {lastResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Send result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Sent:</span> {lastResult.sent}
                </p>
                {lastResult.skipped.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">
                      Skipped ({lastResult.skipped.length})
                    </p>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {lastResult.skipped.map((s, i) => (
                        <li key={i}>
                          {s.email || "Unknown contact"}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {lastResult.failed.length > 0 && (
                  <div>
                    <p className="font-medium text-destructive mb-1">
                      Failed ({lastResult.failed.length})
                    </p>
                    <ul className="space-y-0.5 text-xs text-destructive">
                      {lastResult.failed.map((f, i) => (
                        <li key={i}>
                          {f.email}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: listing preview + send panel */}
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
              <Button asChild size="sm" variant="outline" className="w-full mt-2">
                <Link
                  href={`/listing/${listing.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preview public page
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle className="text-sm">Personal note (optional)</CardTitle>
                  <CardDescription>
                    Shown at the top of the email inside a highlighted block.
                  </CardDescription>
                </div>
                <AITextActions
                  kind="outreach_listing_share"
                  getCurrentText={() => customMessage}
                  getContext={() => ({
                    listingTitle: listing.title,
                    location: listing.location_text || undefined,
                    price: formatPrice(listing),
                  })}
                  onAccept={(text) => setCustomMessage(text.slice(0, 600))}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Label htmlFor="share-message" className="sr-only">
                Message
              </Label>
              <Textarea
                id="share-message"
                rows={5}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="e.g. This just came onto the market and matches what you were looking for."
                maxLength={600}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {customMessage.length} / 600
              </p>
            </CardContent>
          </Card>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Only contacts with marketing consent can receive this email. Contacts
              without consent are shown here for visibility but cannot be selected.
            </p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleSend}
            disabled={selectedCount === 0 || sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {selectedCount} contact{selectedCount === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
