"use client";

import { timeAgo } from "@/lib/timeAgo";
import type { Notification } from "@/API/NotificationsAPI";
import NotificationIcon from "./NotificationIcon";

/**
 * One notification line. Shared by the header bell's dropdown and the
 * Overview page's activity feed so the two can't drift apart — the only
 * difference between them is the surrounding container, not the row.
 */
export default function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <a
      href={notification.url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
      }}
      className={`flex gap-2.5 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
        notification.is_read ? "opacity-60" : ""
      }`}
    >
      <NotificationIcon type={notification.type} />

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm break-words ${
            // Direct notifications are things waiting on you, so they stay
            // full-weight while ambient repo activity recedes.
            notification.is_direct
              ? "font-medium text-neutral-900 dark:text-neutral-100"
              : "text-neutral-600 dark:text-neutral-400"
          }`}
        >
          {notification.title ?? "Activity in a repository you follow"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {notification.is_direct && (
            <span className="text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
              For you
            </span>
          )}
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            {timeAgo(notification.created_at)}
          </span>
        </div>
      </div>

      {!notification.is_read && (
        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </a>
  );
}
