"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Loader2,
  Mail,
  Send,
  UserCircle,
  Share2,
  ShieldQuestion,
  Paperclip,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getThreadMessages,
  sendMessage,
  markThreadRead,
  requestNdaInThread,
  uploadMessageAttachment,
  type Message,
  type MessageAttachment,
  type MessageRole,
  type ThreadSummary,
} from "@/lib/actions/messages";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";
import { SendListingDialog } from "./send-listing-dialog";

const POLL_INTERVAL_MS = 3000;

type Props = {
  thread: ThreadSummary;
  /** The current user's role inside this thread. */
  viewerRole: MessageRole;
  /** Optional: render a back arrow (mobile). */
  onBack?: () => void;
};

export function ConversationPane({ thread, viewerRole, onBack }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendListingOpen, setSendListingOpen] = useState(false);
  const [isRequestingNda, setIsRequestingNda] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Mark as read whenever new other-side messages appear in view.
  useEffect(() => {
    const msgs = messagesQuery.data?.messages;
    if (!msgs?.length) return;
    const last = msgs[msgs.length - 1];
    if (lastSeenIdRef.current === last.id) return;
    lastSeenIdRef.current = last.id;
    if (last.sender_role !== viewerRole) {
      // The viewer is looking at a message from the other side → mark read.
      markThreadRead(thread.id)
        .then(() => {
          // Refresh thread list to drop unread badge.
          queryClient.invalidateQueries({
            queryKey: viewerRole === "broker" ? ["broker-threads"] : ["buyer-threads"],
          });
        })
        .catch(() => {});
    }
  }, [messagesQuery.data, thread.id, viewerRole, queryClient]);

  // Auto-scroll to bottom on new messages.
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
        queryKey: viewerRole === "broker" ? ["broker-threads"] : ["buyer-threads"],
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
    const next: MessageAttachment[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadMessageAttachment(thread.id, fd);
      if (res.ok) {
        next.push(res.attachment);
      } else {
        toast.error(`${file.name}: ${res.error}`);
      }
    }
    setIsUploading(false);
    if (next.length > 0) {
      setPendingAttachments((prev) => [...prev, ...next]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePending = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRequestNda = async () => {
    setIsRequestingNda(true);
    const res = await requestNdaInThread(thread.id);
    setIsRequestingNda(false);
    if (res.ok) {
      toast.success("NDA request sent");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", thread.id] });
    } else {
      toast.error(res.error);
    }
  };

  const handleListingSent = () => {
    queryClient.invalidateQueries({ queryKey: ["thread-messages", thread.id] });
    queryClient.invalidateQueries({ queryKey: ["broker-threads"] });
  };

  const counterpartyName =
    thread.counterparty.name?.trim() || thread.counterparty.email;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        {onBack && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onBack}
            className="md:hidden"
            aria-label="Back to threads"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-9 w-9">
          <AvatarImage src={thread.counterparty.photo_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(counterpartyName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{counterpartyName}</p>
          <div className="flex items-center gap-x-3 gap-y-0 flex-wrap text-xs text-muted-foreground">
            <a
              href={`mailto:${encodeURIComponent(thread.counterparty.email)}`}
              className="text-primary hover:underline truncate"
            >
              <Mail className="inline h-3 w-3 mr-0.5" />
              {thread.counterparty.email}
            </a>
            {thread.listing_title && thread.listing_slug && (
              <Link
                href={`/listing/${thread.listing_slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 truncate hover:underline"
              >
                <Building2 className="h-3 w-3" />
                {thread.listing_title}
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            )}
          </div>
        </div>
        {viewerRole === "broker" && (
          <Button
            size="sm"
            variant="outline"
            className="hidden sm:flex"
            onClick={() =>
              openBuyer(thread.buyer_user_id, thread.listing_id ?? null)
            }
          >
            <UserCircle className="h-3.5 w-3.5" />
            View profile
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messagesQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-2/3 ml-auto" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        ) : messagesQuery.error ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            Couldn’t load messages. Please refresh.
          </div>
        ) : !messagesQuery.data?.messages.length ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No messages yet — say hello.
          </div>
        ) : (
          <div className="space-y-2">
            {messagesQuery.data.hasMore && (
              <p className="text-center text-[11px] text-muted-foreground">
                Older messages not shown.
              </p>
            )}
            {groupByDay(messagesQuery.data.messages).map(({ day, items }) => (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-2 my-3">
                  <Separator className="flex-1" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {day}
                  </span>
                  <Separator className="flex-1" />
                </div>
                {items.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isMine={m.sender_role === viewerRole}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t px-4 py-3 space-y-2">
        {viewerRole === "broker" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSendListingOpen(true)}
              className="h-7 text-xs"
            >
              <Share2 className="h-3 w-3" />
              Send listing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestNda}
              disabled={!thread.listing_id || isRequestingNda}
              className="h-7 text-xs"
              title={
                !thread.listing_id
                  ? "Open the listing-scoped thread to request an NDA"
                  : "Send the NDA link"
              }
            >
              {isRequestingNda ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShieldQuestion className="h-3 w-3" />
              )}
              Request NDA
            </Button>
          </div>
        )}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${counterpartyName}…`}
          rows={3}
          disabled={isSending}
          className="resize-none text-sm"
        />
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingAttachments.map((a, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[11px] gap-1.5 pr-1"
              >
                <Paperclip className="h-2.5 w-2.5" />
                <span className="truncate max-w-[160px]">{a.name}</span>
                <span className="text-muted-foreground/80">{fmtBytes(a.size)}</span>
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  className="hover:text-destructive"
                  aria-label="Remove attachment"
                >
                  <XIcon className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
          onChange={(e) => handleFilesPicked(e.target.files)}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSending}
              className="h-7 text-xs gap-1.5"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              Attach
            </Button>
            <p className="text-[10px] text-muted-foreground">
              <kbd className="rounded border px-1">⌘</kbd>+<kbd className="rounded border px-1">↵</kbd>{" "}
              to send
            </p>
          </div>
          <Button
            onClick={handleSend}
            disabled={
              isSending ||
              isUploading ||
              (!draft.trim() && pendingAttachments.length === 0)
            }
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </div>

      {viewerRole === "broker" && (
        <SendListingDialog
          open={sendListingOpen}
          onOpenChange={setSendListingOpen}
          threadId={thread.id}
          onSent={handleListingSent}
        />
      )}
    </div>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm",
        )}
      >
        <p>{message.body}</p>
        {message.attachments?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((a, i) =>
              a.url ? (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "block text-xs underline-offset-2 hover:underline",
                    isMine ? "text-primary-foreground/90" : "text-primary",
                  )}
                >
                  📎 {a.name}{" "}
                  <Badge variant="outline" className="text-[10px]">
                    {fmtBytes(a.size)}
                  </Badge>
                </a>
              ) : (
                <span
                  key={i}
                  className={cn(
                    "block text-xs opacity-70",
                    isMine ? "text-primary-foreground/90" : "text-muted-foreground",
                  )}
                >
                  📎 {a.name}{" "}
                  <Badge variant="outline" className="text-[10px]">
                    {fmtBytes(a.size)}
                  </Badge>
                </span>
              ),
            )}
          </div>
        )}
        <p
          className={cn(
            "text-[10px] mt-1",
            isMine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {fmtTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getInitials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
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

function groupByDay(messages: Message[]): { day: string; items: Message[] }[] {
  const groups: { day: string; items: Message[] }[] = [];
  for (const m of messages) {
    const day = fmtDay(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
