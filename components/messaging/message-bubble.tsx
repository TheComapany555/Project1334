"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/actions/messages";

type Props = {
  message: Message;
  isMine: boolean;
  /** Shown on incoming messages only */
  counterpartyName?: string;
  counterpartyPhotoUrl?: string | null;
};

export function MessageBubble({
  message,
  isMine,
  counterpartyName,
  counterpartyPhotoUrl,
}: Props) {
  const displayName = counterpartyName?.trim() || "Contact";
  const initials = getInitials(displayName);

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isMine ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isMine && (
        <Avatar className="mt-0.5 size-8 shrink-0">
          <AvatarImage src={counterpartyPhotoUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex min-w-0 max-w-[min(85%,28rem)] flex-col gap-1",
          isMine ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs",
            isMine
              ? "rounded-tr-md bg-primary text-primary-foreground"
              : "rounded-tl-md border border-border/80 bg-card text-card-foreground",
          )}
        >
          {message.body && message.body !== "(attachment)" && (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}

          {message.attachments?.length > 0 && (
            <ul
              className={cn(
                "space-y-1.5",
                message.body && message.body !== "(attachment)" && "mt-2",
              )}
            >
              {message.attachments.map((a, i) => (
                <li key={i}>
                  <AttachmentChip attachment={a} isMine={isMine} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <time
          dateTime={message.created_at}
          className="px-1 text-[11px] tabular-nums text-muted-foreground"
        >
          {fmtTime(message.created_at)}
        </time>
      </div>
    </div>
  );
}

function AttachmentChip({
  attachment: a,
  isMine,
}: {
  attachment: { name: string; size: number; url?: string | null };
  isMine: boolean;
}) {
  const content = (
    <>
      <FileText
        className={cn(
          "size-4 shrink-0",
          isMine ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
      <Badge
        variant="secondary"
        className={cn(
          "shrink-0 text-[10px] font-normal",
          isMine && "border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground",
        )}
      >
        {fmtBytes(a.size)}
      </Badge>
    </>
  );

  const className = cn(
    "flex w-full max-w-full items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors",
    isMine
      ? "border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15"
      : "border-border bg-muted/50 hover:bg-muted",
  );

  if (a.url) {
    return (
      <Link
        href={a.url}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn(className, "opacity-80")} role="listitem">
      {content}
    </div>
  );
}

function getInitials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
