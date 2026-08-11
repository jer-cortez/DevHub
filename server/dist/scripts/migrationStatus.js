"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Reports which files in prisma/sql have been applied to the database.
 *
 *   npm run migrate:status
 *
 * The ledger only helps if something reads it. This compares the files on
 * disk against the schema_migrations table and reports three things:
 *
 *   applied  — file has a row, and its contents match what was recorded
 *   PENDING  — file has no row; run it with `prisma db execute --file`
 *   CHANGED  — file has a row but its contents differ from when it was
 *              applied, so the database no longer matches the file
 *
 * CHANGED is the one worth caring about. Editing an already-applied
 * migration is the classic way a schema silently diverges from its record:
 * the file says one thing, the database another, and a fresh environment
 * built from the files gets a different schema from the one in production.
 * The fix is a new migration, never an edit to an old one.
 *
 * Checksums are recorded here rather than in the SQL files because a file
 * can't hash itself. The first run after a migration is applied records what
 * was on disk at that moment.
 */
require("dotenv/config");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const prismaClient_1 = require("../config/prismaClient");
const SQL_DIR = (0, path_1.join)(__dirname, '..', '..', 'prisma', 'sql');
async function main() {
    const files = (0, fs_1.readdirSync)(SQL_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    const ledger = await prismaClient_1.prisma.$queryRawUnsafe('select version, name, checksum, applied_at from schema_migrations');
    const byVersion = new Map(ledger.map((row) => [row.version, row]));
    let pending = 0;
    let changed = 0;
    for (const file of files) {
        const version = file.slice(0, file.indexOf('_'));
        const contents = (0, fs_1.readFileSync)((0, path_1.join)(SQL_DIR, file), 'utf8');
        const checksum = (0, crypto_1.createHash)('md5').update(contents).digest('hex');
        const row = byVersion.get(version);
        if (!row) {
            pending += 1;
            console.log(`  PENDING  ${file}`);
            continue;
        }
        if (row.checksum === null) {
            // First sighting since this migration was applied — record what's on
            // disk now so later edits become detectable.
            await prismaClient_1.prisma.$executeRawUnsafe('update schema_migrations set checksum = $1 where version = $2', checksum, version);
            console.log(`  applied  ${file}  (checksum recorded)`);
            continue;
        }
        if (row.checksum !== checksum) {
            changed += 1;
            console.log(`  CHANGED  ${file}  — edited since it was applied on ` +
                `${row.applied_at.toISOString().slice(0, 10)}; the database does not match this file`);
            continue;
        }
        console.log(`  applied  ${file}  ${row.applied_at.toISOString().slice(0, 10)}`);
    }
    // A row with no file means someone applied a migration and didn't commit
    // it, or deleted one that had already run — both leave a database nobody
    // can rebuild from the repository.
    const fileVersions = new Set(files.map((f) => f.slice(0, f.indexOf('_'))));
    for (const row of ledger) {
        if (!fileVersions.has(row.version)) {
            console.log(`  ORPHAN   ${row.version}_${row.name} recorded in the database but no file on disk`);
        }
    }
    console.log(`\n${files.length} migration files, ${ledger.length} applied` +
        (pending ? `, ${pending} pending` : '') +
        (changed ? `, ${changed} CHANGED` : ''));
    await prismaClient_1.prisma.$disconnect();
    // Non-zero exit so this can gate a deploy: unapplied or edited migrations
    // mean the database and the repository disagree.
    if (pending > 0 || changed > 0)
        process.exit(1);
}
main().catch(async (error) => {
    console.error('migrate:status failed:', error);
    await prismaClient_1.prisma.$disconnect();
    process.exit(1);
});
