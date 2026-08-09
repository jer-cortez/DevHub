import 'dotenv/config';
import crypto from 'crypto';
import { prisma } from '../config/prismaClient';

/**
 * Replays a signed GitHub webhook delivery against the local server, so the
 * whole ingestion path can be exercised without GitHub, a tunnel, or the
 * Sync button: (Testing per launch)
 *
 *   signature verification -> upsert -> repo SSE publish -> notification
 *   fan-out -> Redis -> user SSE stream
 *
 * Sync only ever calls GitHub's REST API and writes rows; it never touches
 * any of that, which is why it can't tell you whether webhooks work.
 *
 * Usage (server must be running):
 *   npm run webhook:simulate -- pull_request opened
 *   npm run webhook:simulate -- issues opened
 *   npm run webhook:simulate -- issues closed
 *   npm run webhook:simulate -- issue_comment created
 *   npm run webhook:simulate -- pr_comment created
 *   npm run webhook:simulate -- pull_request opened --repo Test-Repo-2
 */

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;
const TARGET = process.env.WEBHOOK_TARGET ?? 'http://localhost:8080/api/webhooks/github';

/**
 * A synthetic actor, deliberately distinct from any real GitHub account.
 * Fan-out excludes whoever caused an event, so simulating as yourself would
 * correctly produce zero notifications and look like a bug.
 */
const SENDER = {
  id: 99000900,
  login: 'webhook-simulator',
  avatar_url: 'https://avatars.githubusercontent.com/u/0',
};

/** High ids that can't collide with anything real, so replays stay idempotent and are easy to clean up. */
const FAKE_PR_ID = 99000001;
const FAKE_PR_NUMBER = 9001;
const FAKE_ISSUE_ID = 99000002;
const FAKE_ISSUE_NUMBER = 9002;
const FAKE_COMMENT_ID = 99000003;

function buildPullRequest(repoFullName: string, action: string) {
  const state = action === 'closed' ? 'closed' : 'open';
  return {
    id: FAKE_PR_ID,
    number: FAKE_PR_NUMBER,
    title: `[simulated] ${action} pull request`,
    body: 'Created by scripts/simulateWebhook.ts',
    state,
    merged_at: action === 'merged' ? new Date().toISOString() : null,
    closed_at: state === 'closed' ? new Date().toISOString() : null,
    html_url: `https://github.com/${repoFullName}/pull/${FAKE_PR_NUMBER}`,
    base: { ref: 'main' },
    head: { ref: 'simulated-branch' },
    user: SENDER,
  };
}

function buildIssue(repoFullName: string, action: string) {
  const state = action === 'closed' ? 'closed' : 'open';
  return {
    id: FAKE_ISSUE_ID,
    number: FAKE_ISSUE_NUMBER,
    title: `[simulated] ${action} issue`,
    body: 'Created by scripts/simulateWebhook.ts',
    state,
    closed_at: state === 'closed' ? new Date().toISOString() : null,
    html_url: `https://github.com/${repoFullName}/issues/${FAKE_ISSUE_NUMBER}`,
    user: SENDER,
    assignee: null,
    assignees: [],
  };
}

function buildComment(repoFullName: string, target: 'pull' | 'issues', number: number) {
  return {
    id: FAKE_COMMENT_ID,
    body: '[simulated] comment body',
    html_url: `https://github.com/${repoFullName}/${target}/${number}#issuecomment-${FAKE_COMMENT_ID}`,
    user: SENDER,
    path: 'src/index.ts',
    line: 1,
  };
}

async function main() {
  const [, , rawEvent = 'pull_request', rawAction = 'opened', ...rest] = process.argv;
  const repoFlagIndex = rest.indexOf('--repo');
  const repoName = repoFlagIndex >= 0 ? rest[repoFlagIndex + 1] : undefined;

  if (!WEBHOOK_SECRET) throw new Error('GITHUB_WEBHOOK_SECRET is not set.');

  const repo = repoName
    ? await prisma.repositories.findFirst({ where: { name: repoName } })
    : await prisma.repositories.findFirst();
  if (!repo) throw new Error(`No repository found${repoName ? ` named "${repoName}"` : ''}. Sync repos first.`);

  const org = process.env.GITHUB_ORG_NAME!;
  const repoFullName = `${org}/${repo.name}`;
  // Only repository.id matters to the handlers — it's how they resolve the
  // local repo row — but the rest is included so payloads look realistic.
  const repository = { id: Number(repo.github_repo_id), name: repo.name, full_name: repoFullName };

  let githubEvent: string;
  let payload: Record<string, unknown>;

  switch (rawEvent) {
    case 'pull_request':
      githubEvent = 'pull_request';
      payload = { action: rawAction, repository, sender: SENDER, pull_request: buildPullRequest(repoFullName, rawAction) };
      break;

    case 'issues':
      githubEvent = 'issues';
      payload = { action: rawAction, repository, sender: SENDER, issue: buildIssue(repoFullName, rawAction) };
      break;

    case 'issue_comment':
      githubEvent = 'issue_comment';
      // No `pull_request` key on the issue — that absence is exactly what
      // routes this to the issue-comment handler rather than the PR one.
      payload = {
        action: rawAction,
        repository,
        sender: SENDER,
        issue: buildIssue(repoFullName, 'opened'),
        comment: buildComment(repoFullName, 'issues', FAKE_ISSUE_NUMBER),
      };
      break;

    case 'pr_comment':
      githubEvent = 'pull_request_review_comment';
      payload = {
        action: rawAction,
        repository,
        sender: SENDER,
        pull_request: buildPullRequest(repoFullName, 'opened'),
        comment: buildComment(repoFullName, 'pull', FAKE_PR_NUMBER),
      };
      break;

    default:
      throw new Error(`Unknown event "${rawEvent}". Use: pull_request | issues | issue_comment | pr_comment`);
  }

  const body = JSON.stringify(payload);
  // Signed over the exact bytes sent, mirroring how GitHub signs deliveries
  // and what WebhooksServices.verifySignature recomputes.
  const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

  const before = new Date();
  console.log(`POST ${TARGET}`);
  console.log(`  x-github-event: ${githubEvent} (action=${rawAction})`);
  console.log(`  repo: ${repoFullName}\n`);

  let response: Response;
  try {
    response = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': githubEvent,
        'x-hub-signature-256': signature,
        'x-github-delivery': crypto.randomUUID(),
      },
      body,
    });
  } catch {
    throw new Error(`Could not reach ${TARGET} — is the server running (npm run dev)?`);
  }

  console.log(`Response: ${response.status} ${await response.text()}\n`);
  if (!response.ok) process.exit(1);

  // The handler returns before fan-out finishes writing, so give it a beat.
  await new Promise((r) => setTimeout(r, 600));

  const created = await prisma.notifications.findMany({
    where: { created_at: { gte: before } },
    orderBy: { created_at: 'desc' },
  });

  if (created.length === 0) {
    console.log('No notifications created.');
    console.log('Expected if nobody is on this repo\'s team and no follower opted into this event type.');
    console.log('Join the team on /dashboard/teams, then run this again.');
  } else {
    const users = await prisma.user.findMany({
      where: { id: { in: created.map((n) => n.user_id) } },
    });
    const byId = new Map(users.map((u) => [u.id, u.username]));
    console.log(`${created.length} notification(s) created:`);
    for (const n of created) {
      console.log(`  -> ${byId.get(n.user_id) ?? n.user_id}${n.is_direct ? '  [direct]' : ''}`);
      console.log(`     ${n.title}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('\nSimulation failed:', err.message);
  process.exit(1);
});
