"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditProfileSchema = void 0;
exports.profileVersion = profileVersion;
exports.loadAuditProfiles = loadAuditProfiles;
exports.getAuditProfile = getAuditProfile;
exports.clearAuditProfilesCache = clearAuditProfilesCache;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const zod_1 = require("zod");
const safeSegment = zod_1.z.string().min(1).max(200).refine((value) => value !== '..' && !value.includes('/') && !value.includes('\\') && !value.includes('\0'), 'must be a single safe path segment');
const relativeDirectory = zod_1.z.string().min(1).max(500).refine((value) => {
    if (value === '.')
        return true;
    if (value.startsWith('/') || value.includes('\\') || value.includes(':') || value.endsWith('/'))
        return false;
    return value.split(/[\\/]/).every((part) => safeSegment.safeParse(part).success && !['.', '.git', 'node_modules'].includes(part.toLowerCase()));
}, 'must be a relative directory without parent traversal');
const argvSchema = zod_1.z.array(zod_1.z.string().min(1).max(1000)).min(1).max(32)
    .refine((argv) => !argv.some((value) => value.includes('\0')), 'arguments cannot contain NUL');
const checkSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
    argv: argvSchema,
}).strict();
exports.auditProfileSchema = zod_1.z.object({
    version: zod_1.z.string().min(1).max(80),
    node_image: zod_1.z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,199}$/),
    projects: zod_1.z.array(zod_1.z.object({
        directory: relativeDirectory,
        checks: zod_1.z.array(checkSchema).min(1).max(10),
        rebuild: zod_1.z.array(checkSchema).max(5),
    }).strict()).min(1).max(5),
    enabled: zod_1.z.boolean(),
}).strict();
const profilesSchema = zod_1.z.record(zod_1.z.string().regex(/^[^/\s]+\/[^/\s]+$/), exports.auditProfileSchema);
function canonicalJson(value) {
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
function profileVersion(profile) {
    return (0, node_crypto_1.createHash)('sha256').update(canonicalJson(profile)).digest('hex');
}
let cached;
async function loadAuditProfiles() {
    const path = (0, node_path_1.resolve)(process.env.AUDIT_PROFILES_PATH ?? '../agent/profiles.json');
    const now = Date.now();
    if (cached?.path === path && now - cached.loadedAt < 30000)
        return cached.profiles;
    const parsed = profilesSchema.parse(JSON.parse(await (0, promises_1.readFile)(path, 'utf8')));
    cached = { path, profiles: parsed, loadedAt: now };
    return parsed;
}
async function getAuditProfile(owner, repo) {
    const profiles = await loadAuditProfiles();
    const wanted = `${owner}/${repo}`.toLowerCase();
    const match = Object.entries(profiles).find(([key]) => key.toLowerCase() === wanted);
    return match?.[1] ?? null;
}
function clearAuditProfilesCache() {
    cached = undefined;
}
