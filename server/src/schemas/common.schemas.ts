import { z } from 'zod';

export const idParams = z.object({ id: z.uuid() });
export const repoIdParams = z.object({ repoId: z.uuid() });
export const prIdParams = z.object({ prId: z.uuid() });
export const dependencyIdParams = z.object({ dependencyId: z.uuid() });

/** Caps a JSON-ish field's serialized size so a client can't post an unbounded blob (e.g. drawing board canvases). */
export function isWithinSerializedSize(maxBytes: number) {
  return (value: unknown) => Buffer.byteLength(JSON.stringify(value ?? null), 'utf-8') <= maxBytes;
}

/**
 * Parses a comma-separated query param (e.g. `?prIds=a,b,c`) into a list of
 * valid UUIDs, silently dropping anything malformed rather than passing it
 * through to the database layer, and capping how many ids a single request
 * can request at once.
 */
export function parseUuidListQuery(raw: unknown, maxItems = 200): string[] {
  const str = typeof raw === 'string' ? raw : '';
  return str
    .split(',')
    .map((s) => s.trim())
    .filter((s) => z.uuid().safeParse(s).success)
    .slice(0, maxItems);
}
