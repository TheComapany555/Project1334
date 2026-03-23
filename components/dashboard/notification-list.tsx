"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const NOTIFICATION_ICONS: Record<string, string> = {
  enquiry_received: "💬",
  enquiry_reply: "↩️",
  listing_published: "✅",
  listing_unpublished: "⚠️",
  payment_received: "💰",
  payment_approved: "✅",
  invoice_requested: "🧾",
  subscription_activated: "🎉",
  subscription_cancelled: "❌",
  subscription_expiring: "⏰",
  broker_joined: "👤",
  broker_removed: "👤",
  agency_approved: "🏢",
  general: "📢",
};

type Props = {
  initialNotifications: Notification[];
};

export function NotificationList({ initialNotifications }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleClick(n: Notification) {
    if (!n.is_read) {
      startTransition(async () => {
        await markAsRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
      });
    }
    if (n.link) {
      router.push(n.link);
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAsRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "All caught up"}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>
      <Separator />
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-muted-foreground">
              No notifications yet.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 sm:px-6",
                  !n.is_read && "bg-muted/30"
                )}
              >
                <span className="mt-0.5 text-lg leading-none">
                  {NOTIFICATION_ICONS[n.type] ?? "📢"}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm",
                      !n.is_read && "font-medium"
                    )}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {n.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
