"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  MessageSquare,
  UserCircle,
} from "lucide-react";
import {
  getThreadMessages,
  sendMessage,
  markThreadRead,
  requestNdaInThread,
  uploadMessageAttachment,
  type MessageRole,
  type ThreadSummary,
} from "@/lib/actions/messages";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { SendListingDialog } from "./send-listing-dialog";

const POLL_INTERVAL_MS = 3000;

type Props = {
  thread: ThreadSummary;
  viewerRole: MessageRole;
  onBack?: () => void;
};

export function ConversationPane({ thread, viewerRole, onBack }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendListingOpen, setSendListingOpen] = useState(false);
  const [isRequestingNda, setIsRequestingNda] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    import("@/lib/actions/messages").MessageAttachment[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const openBuyer = useBuyerPanelStore((s) => s.openBuyer);

  const messagesQuery = useQuery({
    queryKey: ["thread-messages", thread.id],
    queryFn: () => getThreadMessages(thread.id, { limit: 80 }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    const msgs = messagesQuery.data?.messages;
    if (!msgs?.length) return;
    const last = msgs[msgs.length - 1];
    if (lastSeenIdRef.current === last.id) return;
    lastSeenIdRef.current = last.id;
    if (last.sender_role !== viewerRole) {
      markThreadRead(thread.id)
        .then(() => {
          queryClient.invalidateQueries({
            queryKey:
              viewerRole === "broker" ? ["broker-threads"] : ["buyer-threads"],
          });
        })
        .catch(() => {});
    }
  }, [messagesQuery.data, thread.id, viewerRole, queryClient]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messagesQuery.data?.messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body && pendingAttachments.length === 0) return;
    setIsSending(true);
    const optimisticBody = draft;
    const optimisticAttachments = pendingAttachments;
    setDraft("");
    setPendingAttachments([]);
    const res = await sendMessage({
      threadId: thread.id,
      body: body || "(attachment)",
      attachments: optimisticAttachments,
    });
    setIsSending(false);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["thread-messages", thread.id] });
      queryClient.invalidateQueries({
        queryKey:
          viewerRole === "broker" ? ["broker-threads"] : ["buyer-threads"],
      });
    } else {
      setDraft(optimisticBody);
      setPendingAttachments(optimisticAttachments);
      toast.error(res.error);
    }
  };

  const handleFilesPicked = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    const next: typeof pendingAttachments = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadMessageAttachment(thread.id, fd);
      if (res.ok) next.push(res.attachment);
      else toast.error(`${file.name}: ${res.error}`);
    }
    setIsUploading(false);
    if (next.length > 0) setPendingAttachments((prev) => [...prev, ...next]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    handleSend();
  };

  const handleRequestNda = async () => {
    setIsRequestingNda(true);
    const res = await requestNdaInThread(thread.id);
    setIsRequestingNda(false);
    if (res.ok) {
      toast.success("NDA request sent");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", thread.id] });
    } else toast.error(res.error);
  };

  const counterpartyName =
    thread.counterparty.name?.trim() || thread.counterparty.email;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {/* Thread header */}
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        {onBack && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onBack}
            className="md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <Avatar className="size-9">
          <AvatarImage src={thread.counterparty.photo_url ?? undefined} />
          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
            {getInitials(counterpartyName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {counterpartyName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {thread.counterparty.email}
          </p>
        </div>
        {thread.listing_title && thread.listing_slug && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden shrink-0 sm:inline-flex"
          >
            <Link
              href={`/listing/${thread.listing_slug}`}
              target="_blank"
              className="max-w-[200px]"
            >
              <Building2 className="size-3.5" />
              <span className="truncate">{thread.listing_title}</span>
            </Link>
          </Button>
        )}
        {viewerRole === "broker" && (
          <Button
            size="sm"
            variant="ghost"
            className="hidden shrink-0 sm:inline-flex"
            onClick={() =>
              openBuyer(thread.buyer_user_id, thread.listing_id ?? null)
            }
          >
            <UserCircle className="size-3.5" />
            Profile
          </Button>
        )}
      </header>

      {/* Message stream */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {messagesQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="ml-0 h-16 w-[72%] rounded-2xl" />
            <Skeleton className="ml-auto h-14 w-[58%] rounded-2xl" />
            <Skeleton className="ml-0 h-12 w-[64%] rounded-2xl" />
          </div>
        ) : messagesQuery.error ? (
          <EmptyThreadState
            icon={MessageSquare}
            title="Couldn't load messages"
            description="Please refresh the page and try again."
          />
        ) : !messagesQuery.data?.messages.length ? (
          <EmptyThreadState
            icon={MessageSquare}
            title="No messages yet"
            description={`Send a message to start your conversation with ${counterpartyName}.`}
          />
        ) : (
          <div className="space-y-4">
            {messagesQuery.data.hasMore && (
              <p className="text-center text-xs text-muted-foreground">
                Older messages are not shown
              </p>
            )}
            {groupByDay(messagesQuery.data.messages).map(({ day, items }) => (
              <section key={day} className="space-y-3">
                <div className="sticky top-0 z-10 flex justify-center py-1">
                  <span className="rounded-full bg-background/95 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    {day}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isMine={m.sender_role === viewerRole}
                      counterpartyName={counterpartyName}
                      counterpartyPhotoUrl={thread.counterparty.photo_url}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <MessageComposer
        viewerRole={viewerRole}
        counterpartyName={counterpartyName}
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        onKeyDown={handleKey}
        isSending={isSending}
        isUploading={isUploading}
        pendingAttachments={pendingAttachments}
        onRemoveAttachment={(i) =>
          setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))
        }
        onFilesPicked={handleFilesPicked}
        onSendListing={
          viewerRole === "broker" ? () => setSendListingOpen(true) : undefined
        }
        onRequestNda={viewerRole === "broker" ? handleRequestNda : undefined}
        canRequestNda={!!thread.listing_id}
        isRequestingNda={isRequestingNda}
      />

      {viewerRole === "broker" && (
        <SendListingDialog
          open={sendListingOpen}
          onOpenChange={setSendListingOpen}
          threadId={thread.id}
          onSent={() => {
            queryClient.invalidateQueries({
              queryKey: ["thread-messages", thread.id],
            });
            queryClient.invalidateQueries({ queryKey: ["broker-threads"] });
          }}
        />
      )}
    </div>
  );
}

function EmptyThreadState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function getInitials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function groupByDay(
  messages: import("@/lib/actions/messages").Message[],
): { day: string; items: import("@/lib/actions/messages").Message[] }[] {
  const groups: { day: string; items: import("@/lib/actions/messages").Message[] }[] =
    [];
  for (const m of messages) {
    const day = fmtDay(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}
