"use client";

import Link from "next/link";
import { useNotifications } from "@/contexts/NotificationsContext";
import NotificationRow from "./NotificationRow";

/** Kept short — the header bell holds the full history, this is a glance. */
const VISIBLE_LIMIT = 6;

/**
 * The Overview page's activity feed. Reads from the same
 * NotificationsProvider the header bell uses, so it shares one SSE
 * connection and one SWR cache entry: marking something read here updates
 * the bell's unread badge instantly, with no refetch.
 */
export default function NotificationsFeed() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const visible = notifications.slice(0, VISIBLE_LIMIT);

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Your activity</span>
          {unreadCount > 0 && (
            <span className="text-xs rounded-full px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-6 text-sm text-neutral-500 text-center">
          No activity yet.{" "}
          <Link href="/dashboard/teams" className="text-blue-600 dark:text-blue-400 hover:underline">
            Join a team or follow a repository
          </Link>{" "}
          to start receiving updates.
        </p>
      ) : (
        visible.map((notification) => (
          <div
            key={notification.id}
            className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
          >
            <NotificationRow notification={notification} onRead={markRead} />
          </div>
        ))
      )}

      {notifications.length > VISIBLE_LIMIT && (
        <p className="px-4 py-2 text-xs text-neutral-400 dark:text-neutral-600 border-t border-neutral-200 dark:border-neutral-800">
          Showing {VISIBLE_LIMIT} of {notifications.length} — open the bell for the rest.
        </p>
      )}
    </div>
  );
}
