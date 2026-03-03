"use client";

import Link from "next/link";
import { useState } from "react";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import type { EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  Calendar,
  Mail,
  Phone,
  Tag,
  User,
  ExternalLink,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name?: string | null, email?: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (email ?? "?")[0].toUpperCase();
}

type Props = {
  enquiries: EnquiryWithListingAndBroker[];
  page: number;
  totalPages: number;
};

export function EnquiriesTable({ enquiries }: Props) {
  const [selected, setSelected] = useState<EnquiryWithListingAndBroker | null>(null);

  return (
    <>
      {/* Card list — no horizontal scroll, fully responsive */}
      <div className="divide-y divide-border">
        {enquiries.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e)}
            className="w-full text-left px-4 py-3 sm:px-6 hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-start gap-3 min-w-0">
              {/* Avatar */}
              <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {getInitials(e.contact_name, e.contact_email)}
                </AvatarFallback>
              </Avatar>

              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* Row 1: name + badge + chevron */}
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">
                      {e.contact_name || e.contact_email}
                    </span>
                    {e.reason && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {ENQUIRY_REASON_LABELS[e.reason] ?? e.reason}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Row 2: listing */}
                {e.listing && (
                  <p className="text-xs text-primary truncate font-medium">
                    {e.listing.title}
                  </p>
                )}

                {/* Row 3: broker + date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {e.broker && (
                    <>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {e.broker.name ?? e.broker.company ?? "—"}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateShort(e.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {selected && (
            <>
              {/* Sheet header with avatar */}
              <div className="px-6 py-5 border-b bg-muted/30">
                <SheetHeader className="mb-3">
                  <SheetTitle className="text-base">Enquiry details</SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                      {getInitials(selected.contact_name, selected.contact_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {selected.contact_name || selected.contact_email}
                    </p>
                    {selected.contact_name && (
                      <p className="text-xs text-muted-foreground">{selected.contact_email}</p>
                    )}
                    {selected.reason && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {ENQUIRY_REASON_LABELS[selected.reason] ?? selected.reason}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5 text-sm">
                {/* Listing */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Listing
                  </p>
                  {selected.listing ? (
                    <Link
                      href={`/listing/${selected.listing.slug}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selected.listing.title}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <Separator />

                {/* Broker */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Broker
                  </p>
                  <p className="font-medium">
                    {selected.broker
                      ? [selected.broker.name, selected.broker.company].filter(Boolean).join(" · ") || "—"
                      : "—"}
                  </p>
                </div>

                <Separator />

                {/* Contact */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Contact
                  </p>
                  <div className="space-y-2">
                    {selected.contact_name && (
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{selected.contact_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${selected.contact_email}`}
                        className="text-primary hover:underline break-all"
                      >
                        {selected.contact_email}
                      </a>
                    </div>
                    {selected.contact_phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`tel:${selected.contact_phone}`}
                          className="text-primary hover:underline"
                        >
                          {selected.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Reason */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Reason
                  </p>
                  {selected.reason ? (
                    <Badge variant="secondary">
                      {ENQUIRY_REASON_LABELS[selected.reason] ?? selected.reason}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <Separator />

                {/* Message */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/60 border p-3.5 text-sm leading-relaxed">
                    {selected.message}
                  </p>
                </div>

                <Separator />

                {/* Date */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Date
                  </p>
                  <p className="text-muted-foreground">{formatDate(selected.created_at)}</p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <a href={`mailto:${selected.contact_email}`}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Email contact
                    </a>
                  </Button>
                  {selected.contact_phone && (
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <a href={`tel:${selected.contact_phone}`}>
                        <Phone className="h-3.5 w-3.5 mr-1.5" />
                        Call contact
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}