"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { NotificationsAPI, notificationsKey, type Notification } from "@/API/NotificationsAPI";
import { useNotificationStream } from "@/hooks/useNotificationStream";

const TOAST_DURATION_MS = 6000;

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  toasts: Notification[];
  dismissToast: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationsProvider");
  return context;
}

/**
 * Owns the single notification SSE connection for the whole dashboard.
 *
 * The bell and the toast stack both need live notifications, but opening one
 * stream per component would mean two connections delivering identical data
 * (and browsers cap concurrent connections per host). Holding the stream
 * here, above both, keeps it to one.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data, mutate } = useSWR(notificationsKey, NotificationsAPI.findMine);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const handleNotification = useCallback(
    (notification: Notification) => {
      // Written straight into the SWR cache rather than triggering a
      // refetch: the pushed payload is the complete row, so a round-trip
      // would only re-fetch what we already have.
      mutate(
        (current) => ({
          notifications: [notification, ...(current?.notifications ?? [])],
          unreadCount: (current?.unreadCount ?? 0) + 1,
        }),
        { revalidate: false }
      );

      setToasts((current) => [...current, notification]);
      timers.current.set(
        notification.id,
        setTimeout(() => dismissToast(notification.id), TOAST_DURATION_MS)
      );
    },
    [mutate, dismissToast]
  );

  useNotificationStream(handleNotification);

  // Any toast timers still pending when the dashboard unmounts would fire
  // into a dead component otherwise.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const markRead = useCallback(
    (id: string) => {
      mutate(
        async (current) => {
          await NotificationsAPI.markRead(id);
          const notifications = (current?.notifications ?? []).map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
          };
        },
        { revalidate: false, optimisticData: (current) => {
          const notifications = (current?.notifications ?? []).map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          );
          return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length };
        } }
      );
    },
    [mutate]
  );

  const markAllRead = useCallback(() => {
    mutate(
      async (current) => {
        await NotificationsAPI.markAllRead();
        return {
          notifications: (current?.notifications ?? []).map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        };
      },
      {
        revalidate: false,
        optimisticData: (current) => ({
          notifications: (current?.notifications ?? []).map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        }),
      }
    );
  }, [mutate]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications: data?.notifications ?? [],
        unreadCount: data?.unreadCount ?? 0,
        toasts,
        dismissToast,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
