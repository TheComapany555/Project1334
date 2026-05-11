"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, Inbox, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreadSummary, MessageRole } from "@/lib/actions/messages";

type Props = {
  threads: ThreadSummary[];
  isLoading?: boolean;
  selectedThreadId: string | null;
  onSelect: (thread: ThreadSummary) => void;
  /** "broker" or "buyer" — controls phrasing for the empty state. */
  viewerRole: MessageRole;
};

export function ThreadList({
  threads,
  isLoading,
  selectedThreadId,
  onSelect,
  viewerRole,
}: Props) {
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = threads;
    if (unreadOnly) list = list.filter((t) => t.unread_count > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const blob =
          `${t.counterparty.name ?? ""} ${t.counterparty.email} ${t.listing_title ?? ""} ${t.last_message_preview ?? ""}`.toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [threads, search, unreadOnly]);

  return (
    <div className="flex h-full flex-col border-r">
      {/* Search bar */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant={unreadOnly ? "default" : "outline"}
          onClick={() => setUnreadOnly((v) => !v)}
          className="h-7 w-full gap-1.5 text-xs"
        >
          <Filter className="h-3 w-3" />
          {unreadOnly ? "Showing unread" : "Show unread only"}
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasAny={threads.length > 0}
            unreadOnly={unreadOnly}
            viewerRole={viewerRole}
          />
        ) : (
          <ul>
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition relative flex items-start gap-3",
                    selectedThreadId === t.id && "bg-muted/70",
                    t.unread_count > 0 && "font-medium",
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={t.counterparty.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(
                        t.counterparty.name ?? t.counterparty.email,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm truncate">
                        {t.counterparty.name ?? t.counterparty.email}
                      </p>
                      {t.last_message_at && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {fmtRelative(t.last_message_at)}
                        </span>
                      )}
                    </div>
                    {t.listing_title && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {t.listing_title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.last_sender_role && (
                        <span className="text-muted-foreground/70">
                          {t.last_sender_role === viewerRole ? "You: " : ""}
                        </span>
                      )}
                      {t.last_message_preview ?? "No messages yet"}
                    </p>
                  </div>
                  {t.unread_count > 0 && (
                    <Badge
                      variant="default"
                      className="text-[10px] shrink-0 h-5 min-w-[20px] flex items-center justify-center"
                    >
                      {t.unread_count}
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  hasAny,
  unreadOnly,
  viewerRole,
}: {
  hasAny: boolean;
  unreadOnly: boolean;
  viewerRole: MessageRole;
}) {
  if (unreadOnly) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Inbox zero — no unread conversations.
      </div>
    );
  }
  if (hasAny) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Nothing matches that search.
      </div>
    );
  }
  return (
    <div className="p-6 text-center text-sm text-muted-foreground">
      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="font-medium text-foreground">No conversations yet</p>
      <p className="text-xs mt-1">
        {viewerRole === "broker"
          ? "Open a buyer profile and click Message to start a chat."
          : "When a broker replies to your enquiry via chat, the conversation appears here."}
      </p>
    </div>
  );
}

function getInitials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
