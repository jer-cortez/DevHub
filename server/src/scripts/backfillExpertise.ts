/**
 * Backfills the expertise index from historical pull requests.
 *
 *   npx ts-node src/scripts/backfillExpertise.ts [--all] [--limit N] [--dry-run]
 *
 * By default only merged PRs are indexed — shipped work is the signal worth
 * ranking on. `--all` includes open and closed PRs too.
 *
 * Each PR costs one GitHub API call (cached in Redis by head SHA, so a second
 * run is nearly free). The 5,000/hour limit is the real constraint on a large
 * org, so this checks remaining quota as it goes and stops cleanly rather
 * than failing halfway through with a wall of 403s.
 */
import 'dotenv/config';
import { prisma } from '../config/prismaClient';
import { redisPub, redisSub, redisCache } from '../lib/redis';
import { octokit } from '../lib/github';
import { ExpertiseServices } from '../services/expertise.services';

/**
 * All three Redis connections are opened at import time by lib/redis, and an
 * open socket keeps Node's event loop alive — without this the script does
 * its work and then hangs forever instead of exiting.
 */
async function shutdown() {
  await prisma.$disconnect();
  await Promise.allSettled([redisPub.quit(), redisSub.quit(), redisCache.quit()]);
}

/** Leave headroom so a backfill can't starve the running app of quota. */
const RATE_LIMIT_FLOOR = 200;

async function remainingQuota(): Promise<number> {
  const { data } = await octokit.request('GET /rate_limit');
  return data.resources.core.remaining;
}

async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes('--all');
  const dryRun = args.includes('--dry-run');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : undefined;

  // Skipping already-indexed PRs is what makes this safe to re-run and safe
  // to resume after stopping at the rate-limit floor.
  const indexed = await prisma.file_touches.findMany({
    select: { pr_id: true },
    distinct: ['pr_id'],
  });
  const indexedIds = new Set(indexed.map((row) => row.pr_id));

  const candidates = await prisma.pull_request.findMany({
    where: {
      head_sha: { not: null },
      ...(includeAll ? {} : { status: 'merged' }),
    },
    orderBy: { merged_at: 'desc' },
    ...(limit ? { take: limit } : {}),
  });

  const pending = candidates.filter((pr) => !indexedIds.has(pr.id));

  console.log(
    `${candidates.length} candidate PRs (${includeAll ? 'all statuses' : 'merged only'}), ` +
      `${indexedIds.size} already indexed, ${pending.length} to process`
  );

  if (dryRun || pending.length === 0) {
    if (dryRun) console.log('--dry-run: stopping before any GitHub calls');
    await shutdown();
    return;
  }

  let quota = await remainingQuota();
  console.log(`GitHub quota remaining: ${quota}`);

  let processed = 0;
  let touches = 0;
  let failed = 0;

  for (const pr of pending) {
    if (quota <= RATE_LIMIT_FLOOR) {
      console.log(
        `\nStopping: quota down to ${quota} (floor ${RATE_LIMIT_FLOOR}). ` +
          `Re-run later to resume — ${pending.length - processed} PRs remain.`
      );
      break;
    }

    try {
      const written = await ExpertiseServices.indexPr(pr.id);
      touches += written;
      processed += 1;
      // Cheaper than re-checking the API every iteration; a listFiles call is
      // one request, plus pagination on very large PRs.
      quota -= 1;

      if (processed % 25 === 0) {
        quota = await remainingQuota();
        console.log(`  ${processed}/${pending.length} PRs, ${touches} touches, quota ${quota}`);
      }
    } catch (error) {
      // A deleted repo or a PR whose files GitHub won't serve shouldn't kill
      // a run that's already indexed hundreds of others.
      failed += 1;
      console.warn(`  PR #${pr.github_pr_number}: ${(error as Error).message}`);
    }
  }

  const stats = await ExpertiseServices.getIndexStats();
  console.log(
    `\nDone: ${processed} PRs indexed, ${touches} touches written, ${failed} failed.\n` +
      `Index now: ${stats.touches} touches across ${stats.prs} PRs and ${stats.users} people.`
  );

  await shutdown();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  await shutdown();
  process.exit(1);
});
