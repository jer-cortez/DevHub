import { useEffect } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/API/NotificationsAPI";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/**
 * Subscribes to the current user's personalized notification stream.
 *
 * This is the user-scoped counterpart to useRepoEvents: that one delivers
 * everything happening in one repo, but only while that repo's page is
 * open. This one delivers only what concerns *you* — across every repo you
 * work on or follow — and stays connected anywhere in the dashboard, which
 * is what lets the header bell update no matter where you are.
 *
 * Uses @microsoft/fetch-event-source rather than native EventSource for the
 * same reason documented in useRepoEvents: it can send a normal
 * `Authorization: Bearer` header instead of putting the access token in the
 * URL query string.
 */
export function useNotificationStream(onNotification: (notification: Notification) => void) {
  useEffect(() => {
    const controller = new AbortController();

    async function connect() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetchEventSource(`${API_URL}/api/notifications/stream`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        signal: controller.signal,
        // Without this the browser closes the stream when the tab is
        // backgrounded, which is exactly when a notification is most worth
        // receiving — the whole point is to catch activity you're not
        // actively watching for.
        openWhenHidden: true,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`Notification stream failed: ${response.status}`);
          }
        },
        onmessage(message) {
          // Heartbeat frames and teardown chunks can arrive with no data —
          // same guard as useRepoEvents, for the same reason.
          if (!message.data) return;
          try {
            onNotification(JSON.parse(message.data));
          } catch (err) {
            console.error("Failed to parse notification:", err, message.data);
          }
        },
        onerror(err) {
          console.error("Notification stream error:", err);
          // Returning rather than throwing keeps fetch-event-source
          // retrying with its default backoff.
        },
      });
    }

    connect().catch((err) => {
      if (err.name !== "AbortError") {
        console.error("Failed to open notification stream:", err);
      }
    });

    return () => controller.abort();
  }, [onNotification]);
}
