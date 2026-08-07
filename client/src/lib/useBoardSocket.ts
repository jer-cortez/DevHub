import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const WS_URL = API_URL.replace(/^http/, "ws");

/**
 * Opens a live WebSocket connection to a drawing board, for real-time
 * collaborative editing. Uses the browser's native WebSocket rather than a
 * library — deliberately low-level, mirroring the DIY approach already used
 * for the SSE/Redis pipeline elsewhere in this app.
 *
 * Native WebSocket can't send custom headers (same limitation EventSource
 * had), so auth happens as the connection's first application-level
 * message — { type: 'auth', token } — instead of a token in the URL. The
 * server (boardSocket.ts) enforces this and closes the connection if the
 * first message isn't a valid auth payload.
 *
 * No auto-reconnect logic yet (unlike the SSE hook's fetch-event-source,
 * which reconnects automatically) — a dropped connection stays dropped
 * until the component remounts. Acceptable for a first pass; worth adding
 * if this proves flaky in practice.
 */
export function useBoardSocket(boardId: string) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConnected(false);

    async function connect() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;

      const ws = new WebSocket(`${WS_URL}/ws/boards/${boardId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token: session.access_token }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "sync" || message.type === "update") {
          setNodes(message.nodes ?? []);
          setEdges(message.edges ?? []);
          setConnected(true);
        }
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = (err) => {
        console.error("Board socket error:", err);
      };
    }

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [boardId]);

  const sendUpdate = useCallback((nextNodes: any[], nextEdges: any[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "update", nodes: nextNodes, edges: nextEdges }));
    }
  }, []);

  return { nodes, edges, connected, sendUpdate };
}
