import { anthropic, SUMMARY_MODEL } from '../lib/anthropic';
import { cached, invalidateCachePattern } from '../lib/cache';
import { octokit } from '../lib/github';
import { PullRequestSB } from '../supabase/pullRequestSB';
import { PullRequestServices } from './pullRequest.services';
import { RepositoriesServices } from './repositories.services';
import { PrDiffServices } from './prDiff.services';
import type { pull_request } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

/**
 * Two fields rather than one blob, because they answer different questions and
 * the UI shows them differently: "what changed" is always visible, "how it
 * fits" is what a reviewer from another team actually needs and is worth its
 * own paragraph.
 */
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'Two to four sentences on what this pull request changes, in plain ' +
        'language. Describe the behavior that changes, not which files were ' +
        'touched — the reader can see the file list.',
    },
    impact: {
      type: 'string',
      description:
        'Two to three sentences on how this fits into the repository: which ' +
        'subsystem it belongs to, what it enables or unblocks, and what a ' +
        'reviewer unfamiliar with this area should pay attention to.',
    },
  },
  required: ['summary', 'impact'],
  additionalProperties: false,
};

const SYSTEM_INSTRUCTIONS =
  'You explain pull requests to engineers from other teams who do not know ' +
  "this codebase. Assume a competent engineer with no context on this " +
  "repository's conventions or history. Explain what changed and why it " +
  'matters, not which lines moved. If the diff is truncated, say what you ' +
  'can support from what you were shown and do not speculate about the rest.';

/**
 * Repo-level context: the README and file tree. This is precisely what a
 * reviewer from another team is missing, so it's what makes the "how does
 * this contribute" half of the summary possible.
 *
 * Cached twice over, for different reasons. In Redis, so we don't re-fetch
 * the tree from GitHub per PR; and as a prompt-cache prefix on the request
 * itself, because it's byte-identical across every PR in a repo and so bills
 * at roughly a tenth of the rate after the first summary.
 *
 * Exported because onboarding builds its area summaries from the same
 * context — sharing it means both features hit one Redis entry and one
 * prompt-cache prefix per repo rather than two of each.
 */
export async function repoContext(repoId: string): Promise<string> {
  const repo = await RepositoriesServices.findById(repoId);

  const key = `pr:summary:repo-context:${repoId}`;
  // Set only when this call actually hits GitHub and comes back incomplete.
  // Stays false on a cache hit, since the fetcher doesn't run at all then.
  let degraded = false;

  const context = await cached(key, 86400, async () => {
    // Both lookups are enrichment, not requirements: the diff alone still
    // yields a useful summary. A missing README, an empty repo, or a stored
    // default_branch that no longer matches GitHub must not fail the whole
    // request — it just makes the "how it fits" half thinner.
    let paths = '';
    try {
      const { data: tree } = await octokit.rest.git.getTree({
        owner: ORG_NAME,
        repo: repo.name,
        tree_sha: repo.default_branch,
        recursive: 'true',
      });
      paths = tree.tree
        .filter((node) => node.type === 'blob')
        .map((node) => node.path)
        .slice(0, 400)
        .join('\n');
    } catch (error) {
      degraded = true;
      console.warn(`Repo context: could not read file tree for ${repo.name}:`, error);
    }

    let readme = '';
    try {
      const { data } = await octokit.rest.repos.getReadme({ owner: ORG_NAME, repo: repo.name });
      readme = Buffer.from(data.content, 'base64').toString('utf8').slice(0, 8000);
    } catch {
      // No README in the repo — the file tree alone still conveys structure.
    }

    return [
      `Repository: ${repo.name}`,
      `Description: ${repo.description}`,
      readme && `README:\n${readme}`,
      paths && `File structure:\n${paths}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  });

  // Don't let a transient GitHub failure (expired token, rate limit) pin a
  // thin context for the full 24h TTL — drop it so the next call retries.
  if (degraded) await invalidateCachePattern(key);

  return context;
}

export const PrSummaryServices = {
  /**
   * Returns the stored summary when it matches the PR's current head commit,
   * and generates one otherwise. Callers can treat this as "get the summary" —
   * the model is only hit when the code has actually changed since last time,
   * so cost scales with PR revisions rather than with how many people read it.
   */
  async getOrGenerate(prId: string): Promise<pull_request> {
    const pr = await PullRequestServices.findById(prId);

    if (pr.summary && pr.summary_sha && pr.summary_sha === pr.head_sha) {
      return pr;
    }

    // head_sha is populated during the GitHub sync, so rows that predate this
    // feature need one more sync before they can be summarized.
    if (!pr.head_sha) {
      throw new Error('Pull request has no head_sha — sync this repository from GitHub first');
    }

    const repo = await RepositoriesServices.findById(pr.repo_id);
    const [context, diff] = await Promise.all([
      repoContext(pr.repo_id),
      PrDiffServices.fetch(repo.name, pr.github_pr_number, pr.head_sha),
    ]);

    if (diff.files.length === 0) {
      throw new Error('Pull request has no reviewable code changes to summarize');
    }

    const diffText = diff.files
      .map((file) => `--- ${file.filename} (${file.status}, ${file.changes} changes)\n${file.patch}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      // Room for adaptive thinking plus the JSON body. Thinking bills as
      // output tokens, which is why effort is pinned low below.
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: {
        // A bounded extraction task — low effort keeps thinking tokens, and
        // therefore output cost, down without hurting quality here.
        effort: 'low',
        format: { type: 'json_schema', schema: SUMMARY_SCHEMA },
      },
      system: [
        { type: 'text', text: SYSTEM_INSTRUCTIONS },
        {
          type: 'text',
          text: context,
          // Identical across every PR in this repo. Needs to clear the model's
          // minimum cacheable prefix to take effect at all — a README plus a
          // file tree normally does; a bare repo with neither won't, which
          // costs nothing beyond the missed discount.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content:
            `Pull request #${pr.github_pr_number}: ${pr.title}\n` +
            `${pr.head_branch} → ${pr.base_branch}\n\n` +
            `Author's description:\n${pr.body || '(none provided)'}\n\n` +
            (diff.truncated
              ? `Diff (truncated — ${diff.omittedFiles} further changed files were omitted):\n`
              : 'Diff:\n') +
            diffText,
        },
      ],
    });

    // Token accounting per summary. cache_read is the one to watch: if it
    // stays at 0 across PRs in the same repo, the repo-context prefix isn't
    // caching and every summary is paying full rate for it.
    const usage = response.usage;
    console.log(
      `PR summary #${pr.github_pr_number} (${repo.name}): ` +
        `in=${usage.input_tokens} out=${usage.output_tokens} ` +
        `cache_write=${usage.cache_creation_input_tokens ?? 0} ` +
        `cache_read=${usage.cache_read_input_tokens ?? 0}`
    );

    // Structured output still needs guarding: a refusal or a hit token cap
    // both yield a response with no parseable body.
    if (response.stop_reason === 'refusal') {
      throw new Error('Model declined to summarize this pull request');
    }
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') {
      throw new Error(`No summary returned (stop_reason: ${response.stop_reason})`);
    }

    const parsed = JSON.parse(block.text) as { summary: string; impact: string };

    return PullRequestSB.setSummary(pr.id, {
      summary: parsed.summary,
      summary_impact: parsed.impact,
      summary_sha: pr.head_sha,
      summary_model: SUMMARY_MODEL,
      summary_truncated: diff.truncated,
    });
  },
};
