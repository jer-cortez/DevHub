import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

const safeSegment = z.string().min(1).max(200).refine(
  (value) => value !== '..' && !value.includes('/') && !value.includes('\\') && !value.includes('\0'),
  'must be a single safe path segment'
);

const relativeDirectory = z.string().min(1).max(500).refine((value) => {
  if (value === '.') return true;
  if (value.startsWith('/') || value.includes('\\') || value.includes(':') || value.endsWith('/')) return false;
  return value.split(/[\\/]/).every((part) =>
    safeSegment.safeParse(part).success && !['.', '.git', 'node_modules'].includes(part.toLowerCase())
  );
}, 'must be a relative directory without parent traversal');

const argvSchema = z.array(z.string().min(1).max(1_000)).min(1).max(32)
  .refine((argv) => !argv.some((value) => value.includes('\0')), 'arguments cannot contain NUL');

const checkSchema = z.object({
  name: z.string().min(1).max(80),
  argv: argvSchema,
}).strict();

export const auditProfileSchema = z.object({
  version: z.string().min(1).max(80),
  node_image: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,199}$/),
  projects: z.array(z.object({
    directory: relativeDirectory,
    checks: z.array(checkSchema).min(1).max(10),
    rebuild: z.array(checkSchema).max(5),
  }).strict()).min(1).max(5),
  enabled: z.boolean(),
}).strict();

export type AuditProfile = z.infer<typeof auditProfileSchema>;

const profilesSchema = z.record(z.string().regex(/^[^/\s]+\/[^/\s]+$/), auditProfileSchema);

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function profileVersion(profile: AuditProfile): string {
  return createHash('sha256').update(canonicalJson(profile)).digest('hex');
}

let cached: { path: string; profiles: Record<string, AuditProfile>; loadedAt: number } | undefined;

export async function loadAuditProfiles(): Promise<Record<string, AuditProfile>> {
  const path = resolve(process.env.AUDIT_PROFILES_PATH ?? '../agent/profiles.json');
  const now = Date.now();
  if (cached?.path === path && now - cached.loadedAt < 30_000) return cached.profiles;
  const parsed = profilesSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  cached = { path, profiles: parsed, loadedAt: now };
  return parsed;
}

export async function getAuditProfile(owner: string, repo: string): Promise<AuditProfile | null> {
  const profiles = await loadAuditProfiles();
  const wanted = `${owner}/${repo}`.toLowerCase();
  const match = Object.entries(profiles).find(([key]) => key.toLowerCase() === wanted);
  return match?.[1] ?? null;
}

export function clearAuditProfilesCache(): void {
  cached = undefined;
}
