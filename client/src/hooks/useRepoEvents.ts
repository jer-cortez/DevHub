import { useEffect } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export interface RepoEvent {
  type: "pull_request" | "comment";
  repoId: string;
  data: unknown;
}

/**
 * Subscribes to a repo's live event stream (PR updates, new comments) over
 * SSE, calling `onEvent` for each one. Uses @microsoft/fetch-event-source
 * instead of the browser's native EventSource specifically so the request
 * can carry a normal `Authorization: Bearer <token>` header — the same
 * auth pattern as every other request in this app via apiFetch — rather
 * than passing the access token in the URL's query string.
 *
 * The library auto-reconnects on connection drops with backoff, matching
 * native EventSource's reconnect behavior.
 */
export function useRepoEvents(repoId: string, onEvent: (event: RepoEvent) => void) {
  useEffect(() => {
    const controller = new AbortController();

    async function connect() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetchEventSource(`${API_URL}/api/repositories/${repoId}/events`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        signal: controller.signal,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`SSE connection failed: ${response.status}`);
          }
        },
        onmessage(message) {
          // A dropped/aborted connection (e.g. navigating away from this
          // page) can deliver one last empty or partial chunk right as
          // teardown happens, before the abort signal is honored — guard
          // against that rather than letting JSON.parse throw on it.
          if (!message.data) return;
          try {
            onEvent(JSON.parse(message.data));
          } catch (err) {
            console.error("Failed to parse repo event:", err, message.data);
          }
        },
        onerror(err) {
          console.error("Repo events connection error:", err);
          // Returning (rather than throwing) tells fetch-event-source to
          // keep retrying with its default backoff, instead of giving up.
        },
      });
    }

    connect().catch((err) => {
      if (err.name !== "AbortError") {
        console.error("Failed to open repo events connection:", err);
      }
    });

    return () => controller.abort();
  }, [repoId, onEvent]);
}
