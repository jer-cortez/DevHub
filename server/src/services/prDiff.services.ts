import { octokit } from '../lib/github';
import { cached } from '../lib/cache';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

/**
 * Files whose diffs are large and semantically empty. Every one of these that
 * reaches the model is tokens spent on noise — a regenerated lockfile alone
 * can be bigger than the actual change it accompanies.
 */
const NOISE_PATTERNS = [
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Gemfile\.lock)$/,
  /(^|\/)(dist|build|out|vendor|node_modules)\//,
  /(^|\/)generated\//,
  /\.(min\.js|min\.css|map|svg|png|jpe?g|gif|ico|woff2?|ttf|pdf)$/,
  /(^|\/)__snapshots__\//,
];

const MAX_FILES = 20;

/**
 * At roughly 4 characters per token this caps diff input near 15k tokens, so
 * a 60-file refactor costs about what a typical PR costs instead of several
 * times more. Truncation is surfaced to the reader rather than hidden — see
 * `truncated` below.
 */
const MAX_PATCH_CHARS = 60_000;

export interface PrDiffFile {
  filename: string;
  status: string;
  changes: number;
  patch: string;
}

export interface PrDiff {
  files: PrDiffFile[];
  /** Files present in the PR but not sent to the model (noise or over budget). */
  omittedFiles: number;
  truncated: boolean;
}

export const PrDiffServices = {
  /**
   * Just the changed file paths — no patches.
   *
   * Separate from `fetch` below because the expertise index only needs
   * filenames, and it needs *all* of them rather than the 20-file slice the
   * summarizer works from. Skipping patch bodies also makes this dramatically
   * cheaper to hold in Redis across a whole-org backfill.
   */
  async listFilePaths(repoName: string, prNumber: number, headSha: string): Promise<string[]> {
    return cached(`pr:filepaths:${repoName}:${prNumber}:${headSha}`, 86400, async () => {
      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: ORG_NAME,
        repo: repoName,
        pull_number: prNumber,
        per_page: 100,
      });

      return files
        .map((file) => file.filename)
        .filter((name) => !NOISE_PATTERNS.some((p) => p.test(name)));
    });
  },

  /**
   * Fetches a PR's diff, dropping generated files and capping total size.
   *
   * Keyed on the head SHA rather than the PR number, so a force-push can
   * never serve the previous diff. That also makes the long TTL safe: the
   * key changes whenever the content does.
   */
  async fetch(repoName: string, prNumber: number, headSha: string): Promise<PrDiff> {
    return cached(`pr:diff:${repoName}:${prNumber}:${headSha}`, 3600, async () => {
      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: ORG_NAME,
        repo: repoName,
        pull_number: prNumber,
        per_page: 100,
      });

      const signal = files.filter((file) => !NOISE_PATTERNS.some((p) => p.test(file.filename)));

      // Largest changes first, so hitting the cap drops the least interesting
      // files rather than whatever GitHub happened to return last.
      const ranked = [...signal].sort((a, b) => b.changes - a.changes);

      const kept: PrDiffFile[] = [];
      let chars = 0;
      let overBudget = false;

      for (const file of ranked.slice(0, MAX_FILES)) {
        // Binary files come back from the API with no patch at all.
        const patch = file.patch ?? '';
        if (!patch) continue;

        if (chars + patch.length > MAX_PATCH_CHARS) {
          overBudget = true;
          break;
        }

        chars += patch.length;
        kept.push({
          filename: file.filename,
          status: file.status,
          changes: file.changes,
          patch,
        });
      }

      return {
        files: kept,
        omittedFiles: files.length - kept.length,
        truncated: overBudget || ranked.length > MAX_FILES,
      };
    });
  },
};
