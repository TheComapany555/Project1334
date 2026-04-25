"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
} from "@/lib/actions/notifications";

const NOTIFICATIONS_KEY = ["notifications"] as const;
const UNREAD_KEY = ["notifications", "unread-count"] as const;

/** Polled list of recent notifications. Drives the bell dropdown. */
export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, limit],
    queryFn: () => getMyNotifications(limit, 0),
    // 30s poll keeps the badge fresh without being chatty.
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Cheap unread count — used for the navbar badge. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/**
 * Optimistic mark-as-read. Updates both the list and the unread count
 * before the server roundtrip; rolls back if the action fails.
 */
export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markAsReadAction(notificationId),
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousLists = qc.getQueriesData({ queryKey: NOTIFICATIONS_KEY });
      const previousUnread = qc.getQueryData<number>(UNREAD_KEY);

      previousLists.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        qc.setQueryData(
          key,
          (value as { id: string; is_read: boolean }[]).map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
        );
      });
      if (typeof previousUnread === "number") {
        qc.setQueryData(UNREAD_KEY, Math.max(0, previousUnread - 1));
      }

      return { previousLists, previousUnread };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previousLists.forEach(([key, value]) => qc.setQueryData(key, value));
      if (ctx?.previousUnread !== undefined) {
        qc.setQueryData(UNREAD_KEY, ctx.previousUnread);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAsReadAction(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousLists = qc.getQueriesData({ queryKey: NOTIFICATIONS_KEY });
      const previousUnread = qc.getQueryData<number>(UNREAD_KEY);

      previousLists.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        qc.setQueryData(
          key,
          (value as { is_read: boolean }[]).map((n) => ({ ...n, is_read: true })),
        );
      });
      qc.setQueryData(UNREAD_KEY, 0);

      return { previousLists, previousUnread };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previousLists.forEach(([key, value]) => qc.setQueryData(key, value));
      if (ctx?.previousUnread !== undefined) {
        qc.setQueryData(UNREAD_KEY, ctx.previousUnread);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}
