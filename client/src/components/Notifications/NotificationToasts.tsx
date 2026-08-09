"use client";

import { useNotifications } from "@/contexts/NotificationsContext";
import NotificationIcon from "./NotificationIcon";

/**
 * Transient pop-ups for notifications that arrive while you're looking at
 * the app. Purely additive to the bell — every toast here is also a
 * persisted row in the panel, so dismissing or missing one loses nothing.
 */
export default function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((toast) => (
        <a
          key={toast.id}
          href={toast.url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto flex gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-3 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          <NotificationIcon type={toast.type} />
          <div className="min-w-0 flex-1">
            {toast.is_direct && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-orange-600 dark:text-orange-400">
                For you
              </span>
            )}
            <p className="text-sm text-neutral-700 dark:text-neutral-300 break-words">
              {toast.title ?? "New activity"}
            </p>
          </div>
          <button
            onClick={(e) => {
              // The whole toast is a link to the event on GitHub, so the
              // dismiss control has to stop the click from navigating.
              e.preventDefault();
              e.stopPropagation();
              dismissToast(toast.id);
            }}
            aria-label="Dismiss notification"
            className="shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm leading-none"
          >
            ✕
          </button>
        </a>
      ))}
    </div>
  );
}
