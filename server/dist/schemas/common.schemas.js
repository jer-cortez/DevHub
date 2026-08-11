"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencyIdParams = exports.prIdParams = exports.repoIdParams = exports.idParams = void 0;
exports.isWithinSerializedSize = isWithinSerializedSize;
exports.parseUuidListQuery = parseUuidListQuery;
const zod_1 = require("zod");
exports.idParams = zod_1.z.object({ id: zod_1.z.uuid() });
exports.repoIdParams = zod_1.z.object({ repoId: zod_1.z.uuid() });
exports.prIdParams = zod_1.z.object({ prId: zod_1.z.uuid() });
exports.dependencyIdParams = zod_1.z.object({ dependencyId: zod_1.z.uuid() });
/** Caps a JSON-ish field's serialized size so a client can't post an unbounded blob (e.g. drawing board canvases). */
function isWithinSerializedSize(maxBytes) {
    return (value) => Buffer.byteLength(JSON.stringify(value ?? null), 'utf-8') <= maxBytes;
}
/**
 * Parses a comma-separated query param (e.g. `?prIds=a,b,c`) into a list of
 * valid UUIDs, silently dropping anything malformed rather than passing it
 * through to the database layer, and capping how many ids a single request
 * can request at once.
 */
function parseUuidListQuery(raw, maxItems = 200) {
    const str = typeof raw === 'string' ? raw : '';
    return str
        .split(',')
        .map((s) => s.trim())
        .filter((s) => zod_1.z.uuid().safeParse(s).success)
        .slice(0, maxItems);
}
