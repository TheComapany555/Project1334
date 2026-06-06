import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { SupportTicketMessage } from "@/lib/types/support";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Renders a support ticket thread. The viewer's own messages align right; the
 * other party's align left. Internal notes (admin-only) are visually distinct
 * and are only ever passed in for the admin view (the broker query strips them).
 */
export function TicketMessages({
  messages,
  viewer,
  brokerName,
}: {
  messages: SupportTicketMessage[];
  viewer: "broker" | "admin";
  brokerName?: string | null;
}) {
  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No messages yet.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const isAdminMsg = m.sender_role === "admin";
        const isOwn =
          (viewer === "admin" && isAdminMsg) ||
          (viewer === "broker" && !isAdminMsg);
        const author = m.is_internal
          ? "Internal note"
          : isOwn
            ? "You"
            : isAdminMsg
              ? "Support"
              : brokerName?.trim() || "Broker";
        return (
          <li
            key={m.id}
            className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                m.is_internal
                  ? "border border-amber-500/30 bg-amber-500/10 text-foreground"
                  : isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex items-center gap-2 text-xs",
                  m.is_internal
                    ? "text-amber-700 dark:text-amber-400"
                    : isOwn
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                )}
              >
                {m.is_internal && <Lock className="size-3" />}
                <span className="font-medium">{author}</span>
                <span aria-hidden>·</span>
                <span>{formatWhen(m.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {m.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
