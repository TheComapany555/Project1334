"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types/notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { NotificationIcon } from "@hugeicons/core-free-icons";
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  CornerUpLeft,
  DollarSign,
  FileSignature,
  Megaphone,
  MessageSquare,
  Receipt,
  Send,
  Share2,
  Sparkles,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type IconStyle = { Icon: LucideIcon; tone: string };

const NOTIFICATION_ICON_MAP: Record<string, IconStyle> = {
  enquiry_received: {
    Icon: MessageSquare,
    tone: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
  },
  enquiry_reply: {
    Icon: CornerUpLeft,
    tone: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400",
  },
  enquiry_sent: {
    Icon: Send,
    tone: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400",
  },
  listing_published: {
    Icon: CheckCircle2,
    tone: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
  },
  listing_unpublished: {
    Icon: AlertTriangle,
    tone: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
  },
  listing_shared: {
    Icon: Share2,
    tone: "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400",
  },
  listing_alert_match: {
    Icon: BellRing,
    tone: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
  },
  payment_received: {
    Icon: DollarSign,
    tone: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
  },
  payment_approved: {
    Icon: BadgeCheck,
    tone: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
  },
  invoice_requested: {
    Icon: Receipt,
    tone: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
  },
  subscription_activated: {
    Icon: Sparkles,
    tone: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
  },
  subscription_cancelled: {
    Icon: XCircle,
    tone: "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-400",
  },
  subscription_expiring: {
    Icon: Clock,
    tone: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
  },
  broker_joined: {
    Icon: UserPlus,
    tone: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400",
  },
  broker_removed: {
    Icon: UserMinus,
    tone: "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-400",
  },
  agency_approved: {
    Icon: Building2,
    tone: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
  },
  document_access_requested: {
    Icon: FileSignature,
    tone: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400",
  },
  general: {
    Icon: Megaphone,
    tone: "bg-muted text-muted-foreground ring-1 ring-border",
  },
};

const DEFAULT_ICON_STYLE = NOTIFICATION_ICON_MAP.general;

function NotificationTypeIcon({ type }: { type: string }) {
  const { Icon, tone } = NOTIFICATION_ICON_MAP[type] ?? DEFAULT_ICON_STYLE;
  return (
    <span
      className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        tone,
      )}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

type Props = {
  role: "broker" | "admin" | "user";
};

export function NotificationBell({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fetch unread count on mount and periodically
  const refreshCount = useCallback(() => {
    getUnreadCount().then(setUnread).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (open && !loaded) {
      getMyNotifications(10).then((data) => {
        setNotifications(data);
        setLoaded(true);
      });
    }
    if (!open) {
      setLoaded(false);
    }
  }, [open, loaded]);

  function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      startTransition(async () => {
        await markAsRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
        setUnread((prev) => Math.max(0, prev - 1));
      });
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAsRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setUnread(0);
    });
  }

  const notificationsPath =
    role === "admin"
      ? "/admin/notifications"
      : role === "user"
        ? "/account"
        : "/dashboard/notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        >
          <HugeiconsIcon
            icon={NotificationIcon}
            strokeWidth={2}
            className="size-[18px]"
          />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
              disabled={isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {!loaded ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClickNotification(n)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  !n.is_read && "bg-muted/30"
                )}
              >
                <NotificationTypeIcon type={n.type} />
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
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href={notificationsPath}>
              {role === "user" ? "Open my account" : "View all notifications"}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
