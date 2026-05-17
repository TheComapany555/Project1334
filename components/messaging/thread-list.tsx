"use client";

import { useMemo, useState } from "react";
import { Inbox, MessageSquare, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { MessageRole, ThreadSummary } from "@/lib/actions/messages";

type Props = {
  threads: ThreadSummary[];
  isLoading?: boolean;
  selectedThreadId: string | null;
  onSelect: (thread: ThreadSummary) => void;
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

  const unreadTotal = useMemo(
    () => threads.reduce((acc, t) => acc + (t.unread_count > 0 ? 1 : 0), 0),
    [threads],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 space-y-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="h-9 pl-9"
          />
        </div>
        <Tabs
          value={unreadOnly ? "unread" : "all"}
          onValueChange={(v) => setUnreadOnly(v === "unread")}
        >
          <TabsList className="h-8 w-full">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {unreadTotal > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {unreadTotal}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg p-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasAny={threads.length > 0}
            unreadOnly={unreadOnly}
            viewerRole={viewerRole}
          />
        ) : (
          <ul className="p-1">
            {filtered.map((t) => {
              const isSelected = selectedThreadId === t.id;
              const isUnread = t.unread_count > 0;
              const name = t.counterparty.name ?? t.counterparty.email;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      "hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={t.counterparty.photo_url ?? undefined} />
                      <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                          )}
                        >
                          {name}
                        </p>
                        {t.last_message_at && (
                          <span
                            className={cn(
                              "shrink-0 text-[11px] tabular-nums",
                              isUnread ? "font-medium text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {fmtRelative(t.last_message_at)}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-xs",
                          isUnread ? "text-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {t.last_sender_role === viewerRole && (
                          <span className="text-muted-foreground">You: </span>
                        )}
                        {t.last_message_preview ?? "No messages yet"}
                      </p>
                    </div>
                    {isUnread && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        aria-label={`${t.unread_count} unread`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
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
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Inbox zero</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No unread conversations.
        </p>
      </div>
    );
  }
  if (hasAny) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        Nothing matches that search.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No conversations yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {viewerRole === "broker"
          ? "Open a buyer profile and click Message to start a chat."
          : "When a broker replies to your enquiry, the conversation appears here."}
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
