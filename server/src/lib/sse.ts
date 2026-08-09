import type { Response } from 'express';
import { redisSub, REPO_EVENTS_CHANNEL } from './redis';

/**
 * Shape of an event broadcast to browsers watching a repo's live updates.
 * `type` distinguishes what changed so the frontend knows how to react;
 * `data` is the raw upserted row (a pull_request or review_comments record).
 */
export interface RepoEvent {
  type: 'pull_request' | 'issue' | 'comment';
  repoId: string;
  data: unknown;
}

/**
 * Per-instance registry of locally-connected SSE clients, keyed by repoId.
 *
 * This only tracks connections held open by *this* server process. Redis
 * pub/sub (see below) is what makes this work across multiple instances:
 * every instance subscribes to the same channel and independently fans out
 * to whichever local clients are in its own `clients` map, regardless of
 * which instance actually received the webhook that triggered the event.
 * That keeps the fan-out logic identical in both the single-instance and
 * multi-instance case — there's exactly one code path (the Redis message
 * handler below), not a special case for "this instance produced the event."
 */
const clients = new Map<string, Set<Response>>();

/** Registers a browser's open SSE response so it starts receiving events for `repoId`. */
export function addClient(repoId: string, res: Response) {
  if (!clients.has(repoId)) {
    clients.set(repoId, new Set());
  }
  clients.get(repoId)!.add(res);
}

/** Unregisters a client (called when the connection closes) and cleans up empty entries. */
export function removeClient(repoId: string, res: Response) {
  const set = clients.get(repoId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    clients.delete(repoId);
  }
}

/** Writes an SSE `data:` frame to every client currently watching `repoId` on this instance. */
export function broadcastToRepo(repoId: string, event: RepoEvent) {
  const set = clients.get(repoId);
  if (!set) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}

// Subscribe once, at module load, for the lifetime of the process.
redisSub.subscribe(REPO_EVENTS_CHANNEL, (err) => {
  if (err) {
    console.error('Failed to subscribe to Redis channel:', err);
  }
});

// This fires whenever ANY instance publishes to REPO_EVENTS_CHANNEL,
// including this one — the webhook handler never writes to SSE clients
// directly, it only publishes to Redis, so this is the single place
// events actually reach connected browsers.
//
// redisSub is shared with boardSocket.ts (subscribed to a different
// channel for the drawing-board feature), and ioredis fires every
// registered 'message' listener for every channel that client is
// subscribed to — so this has to ignore messages meant for that channel.
redisSub.on('message', (channel, message) => {
  if (channel !== REPO_EVENTS_CHANNEL) return;
  try {
    const event: RepoEvent = JSON.parse(message);
    broadcastToRepo(event.repoId, event);
  } catch (err) {
    console.error('Failed to process Redis pub/sub message:', err);
  }
});
