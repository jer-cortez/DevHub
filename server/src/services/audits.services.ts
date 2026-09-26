import { prisma } from '../config/prismaClient';
import { getAuditOctokit } from '../lib/auditGithub';
import { redisPub, REPO_EVENTS_CHANNEL } from '../lib/redis';
import { getAuditProfile, profileVersion, type AuditProfile } from './auditProfiles.services';
import { UserServices } from './users.services';
import { PullRequestSB } from '../supabase/pullRequestSB';
import type { Prisma } from '../generated/prisma/client';

export type AuditStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'superseded';

interface AuditContext {
  pr_id: string;
  repo_id: string;
  pr_number: number;
  owner: string;
  repo: string;
}

interface AuditRepoContext {
  repo_id: string;
  owner: string;
  repo: string;
}

export interface AuditRunRow extends AuditContext {
  id: string;
  base_sha: string;
  head_sha: string;
  merge_base_sha: string | null;
  config_version: string;
  profile: AuditProfile;
  status: AuditStatus;
  stage: string;
  attempts: number;
  lease_token: string | null;
  lease_until: Date | null;
  cancel_requested: boolean;
  result: Record<string, unknown>;
  usage: Record<string, unknown>;
  error: string | null;
  publication_state: 'none' | 'pending' | 'published' | 'uncertain';
  github_review_id: bigint | null;
  github_review_url: string | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

export class AuditServiceError extends Error {
  constructor(message: string, public readonly statusCode: number) { super(message); }
}

function envEnabled(): boolean {
  return process.env.AUDIT_ENABLED?.toLowerCase() === 'true';
}

function auditSchemaMissing(error: unknown): boolean {
  const value = error as any;
  return value?.meta?.code === '42P01' || value?.cause?.code === '42P01';
}

async function control(): Promise<{ enabled: boolean; publish_enabled: boolean }> {
  const rows = await prisma.$queryRaw<{ enabled: boolean; publish_enabled: boolean }[]>`
    select enabled, publish_enabled from public.audit_control where id = true
  `;
  return rows[0] ?? { enabled: false, publish_enabled: false };
}

async function contextForPr(prId: string): Promise<AuditContext> {
  const configuredOrg = process.env.GITHUB_ORG_NAME ?? '';
  const rows = await prisma.$queryRaw<AuditContext[]>`
    select p.id as pr_id, p.repo_id, p.github_pr_number as pr_number,
           o.name as owner, r.name as repo
      from public.pull_request p
      join public.repositories r on r.id = p.repo_id
      join public.organizations o on o.id = r.org_id
     where p.id = ${prId}::uuid and lower(o.name) = lower(${configuredOrg})
     limit 1
  `;
  if (!rows[0]) throw new AuditServiceError('Pull request is not eligible for auditing', 404);
  return rows[0];
}

async function contextForGithubRepo(githubRepoId: bigint): Promise<AuditRepoContext | null> {
  const configuredOrg = process.env.GITHUB_ORG_NAME ?? '';
  const rows = await prisma.$queryRaw<AuditRepoContext[]>`
    select r.id as repo_id, o.name as owner, r.name as repo
      from public.repositories r
      join public.organizations o on o.id = r.org_id
     where r.github_repo_id = ${githubRepoId}
       and lower(o.name) = lower(${configuredOrg})
     limit 1
  `;
  return rows[0] ?? null;
}

async function syncCurrentPull(repo: AuditRepoContext, pr: any): Promise<AuditContext> {
  const author = await UserServices.upsertByGithubId({
    github_id: pr.user.id,
    username: pr.user.login,
    avatar_url: pr.user.avatar_url,
  });
  const saved = await PullRequestSB.upsertByGithubPrId({
    github_pr_id: BigInt(pr.id),
    github_pr_number: pr.number,
    repo_id: repo.repo_id,
    author_id: author.id,
    title: pr.title,
    body: pr.body,
    status: pr.merged_at ? 'merged' : pr.state,
    base_branch: pr.base.ref,
    head_branch: pr.head.ref,
    head_sha: pr.head.sha,
    github_url: pr.html_url,
    closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
    merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
  });
  return { ...repo, pr_id: saved.id, pr_number: saved.github_pr_number };
}

async function eligibility(ctx: AuditContext): Promise<{ profile: AuditProfile | null; enabled: boolean }> {
  // Keep the feature dormant by default. This also lets the existing server
  // run before migration 006/profile provisioning during a staged rollout.
  if (!envEnabled()) return { profile: null, enabled: false };
  const profile = await getAuditProfile(ctx.owner, ctx.repo).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const gate = await control();
  return { profile, enabled: gate.enabled && Boolean(profile?.enabled) };
}

function publicRun(row: AuditRunRow, lightweight = false): Omit<AuditRunRow, 'profile' | 'lease_token'> {
  const { profile: _profile, lease_token: _leaseToken, ...safe } = row;
  if (safe.result && typeof safe.result === 'object') {
    const { analysis: _analysis, messages: _messages, ...detail } = safe.result as any;
    if (lightweight) {
      const { patches: _patches, checks: _checks, ...summary } = detail;
      safe.result = summary;
    } else {
      safe.result = detail;
    }
  }
  return safe;
}

async function publishAudit(row: AuditRunRow): Promise<void> {
  await redisPub.publish(REPO_EVENTS_CHANNEL, JSON.stringify({
    type: 'audit', repoId: row.repo_id,
    data: { id: row.id, pr_id: row.pr_id, status: row.status },
  }));
}

async function enqueueWithTransaction(
  tx: Prisma.TransactionClient,
  ctx: AuditContext,
  baseSha: string,
  headSha: string,
  profile: AuditProfile
): Promise<AuditRunRow> {
  const version = profileVersion(profile);
  const profileJson = JSON.stringify(profile);
  const inserted = await tx.$queryRaw<AuditRunRow[]>`
    insert into public.audit_runs
      (pr_id, repo_id, owner, repo, pr_number, base_sha, head_sha, config_version, profile)
    values
      (${ctx.pr_id}::uuid, ${ctx.repo_id}::uuid, ${ctx.owner}, ${ctx.repo}, ${ctx.pr_number},
       ${baseSha}, ${headSha}, ${version}, ${profileJson}::jsonb)
    on conflict (pr_id, base_sha, head_sha, config_version)
    do update set updated_at = public.audit_runs.updated_at
    returning *
  `;
  await tx.$executeRaw`
    update public.audit_runs
       set status = 'superseded', cancel_requested = true, stage = 'superseded',
           completed_at = coalesce(completed_at, now()), updated_at = now()
     where pr_id = ${ctx.pr_id}::uuid and id <> ${inserted[0].id}::uuid
       and status in ('queued', 'running')
  `;
  return inserted[0];
}

async function fetchCurrentPull(ctx: Pick<AuditContext, 'owner' | 'repo' | 'pr_number'>) {
  const github = await getAuditOctokit();
  const { data } = await github.rest.pulls.get({ owner: ctx.owner, repo: ctx.repo, pull_number: ctx.pr_number });
  return data;
}

async function lockPullRequest(tx: Prisma.TransactionClient, ctx: AuditContext): Promise<void> {
  await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${`audit:${ctx.pr_id}`}, 0))`;
}

export const AuditServices = {
  publicRun,

  async listForPr(prId: string) {
    const ctx = await contextForPr(prId);
    const eligible = await eligibility(ctx);
    try {
      const rows = await prisma.$queryRaw<AuditRunRow[]>`
        select * from public.audit_runs where pr_id = ${prId}::uuid order by created_at desc limit 30
      `;
      return { enabled: eligible.enabled, runs: rows.map((row) => publicRun(row, true)) };
    } catch (error) {
      if (!envEnabled() && auditSchemaMissing(error)) return { enabled: false, runs: [] };
      throw error;
    }
  },

  async get(runId: string) {
    const rows = await prisma.$queryRaw<AuditRunRow[]>`
      select a.* from public.audit_runs a
      join public.repositories r on r.id = a.repo_id
      join public.organizations o on o.id = r.org_id
      where a.id = ${runId}::uuid and lower(o.name) = lower(${process.env.GITHUB_ORG_NAME ?? ''})
      limit 1
    `;
    if (!rows[0]) throw new AuditServiceError('Audit run not found', 404);
    return publicRun(rows[0]);
  },

  async request(prId: string) {
    const ctx = await contextForPr(prId);
    const { profile, enabled } = await eligibility(ctx);
    if (!enabled || !profile) throw new AuditServiceError('Auditing is not enabled for this repository', 409);
    const outcome = await prisma.$transaction(async (tx) => {
      await lockPullRequest(tx, ctx);
      const pr = await fetchCurrentPull(ctx);
      const sameRepo = pr.head.repo?.full_name?.toLowerCase() === `${ctx.owner}/${ctx.repo}`.toLowerCase();
      if (pr.state !== 'open' || pr.draft || !sameRepo) {
        const cancelled = await tx.$queryRaw<AuditRunRow[]>`
          update public.audit_runs set cancel_requested=true,
            status=case when status='queued' then 'cancelled' else status end,
            stage=case when status='queued' then 'cancelled' else stage end,
            completed_at=case when status='queued' then now() else completed_at end, updated_at=now()
          where pr_id=${ctx.pr_id}::uuid and status in ('queued','running') returning *
        `;
        return { row: null, cancelled };
      }
      return { row: await enqueueWithTransaction(tx, ctx, pr.base.sha, pr.head.sha, profile), cancelled: [] };
    }, { maxWait: 10_000, timeout: 20_000 });
    await Promise.all(outcome.cancelled.map(publishAudit));
    if (!outcome.row) {
      throw new AuditServiceError('Only open, ready, same-repository pull requests can be audited', 409);
    }
    await publishAudit(outcome.row);
    return publicRun(outcome.row);
  },

  async cancel(runId: string) {
    await this.get(runId);
    const rows = await prisma.$queryRaw<AuditRunRow[]>`
      update public.audit_runs
         set cancel_requested = true,
             status = case when status = 'queued' then 'cancelled' else status end,
             stage = case when status = 'queued' then 'cancelled' else stage end,
             completed_at = case when status = 'queued' then now() else completed_at end,
             updated_at = now()
       where id = ${runId}::uuid and status in ('queued', 'running')
       returning *
    `;
    if (!rows[0]) throw new AuditServiceError('Only queued or running audits can be cancelled', 409);
    await publishAudit(rows[0]);
    return publicRun(rows[0]);
  },

  async feedback(runId: string, findingId: string, userId: string, verdict: 'useful' | 'incorrect') {
    const run = await this.get(runId);
    const findings = Array.isArray((run.result as any)?.findings) ? (run.result as any).findings : [];
    if (!findings.some((finding: any) => String(finding?.id) === findingId)) {
      throw new AuditServiceError('Finding not found in this audit run', 404);
    }
    const rows = await prisma.$queryRaw<{ run_id: string; finding_id: string; user_id: string; verdict: string; updated_at: Date }[]>`
      insert into public.audit_feedback (run_id, finding_id, user_id, verdict)
      values (${runId}::uuid, ${findingId}, ${userId}::uuid, ${verdict})
      on conflict (run_id, finding_id, user_id)
      do update set verdict = excluded.verdict, updated_at = now()
      returning run_id, finding_id, user_id, verdict, updated_at
    `;
    return rows[0];
  },

  async handlePullRequestWebhook(deliveryId: string, payload: any): Promise<void> {
    if (!envEnabled()) return;
    if (!deliveryId || !payload?.repository?.id || !payload?.pull_request?.number) return;
    const recorded = await prisma.$queryRaw<{ delivery_id: string; processed: boolean }[]>`
      insert into public.audit_webhook_deliveries (delivery_id) values (${deliveryId})
      on conflict (delivery_id) do update set delivery_id=excluded.delivery_id
      returning delivery_id, processed
    `;
    if (recorded[0].processed) return;
    try {
      const repo = await contextForGithubRepo(BigInt(payload.repository.id));
      if (!repo) {
        await prisma.$executeRaw`update public.audit_webhook_deliveries set processed=true where delivery_id=${deliveryId}`;
        return;
      }
      const initial = await fetchCurrentPull({ ...repo, pr_number: payload.pull_request.number });
      const ctx = await syncCurrentPull(repo, initial);
      const emitted = await prisma.$transaction(async (tx) => {
        await lockPullRequest(tx, ctx);
        const pr = await fetchCurrentPull(ctx);
        const sameRepo = pr.head.repo?.full_name?.toLowerCase() === `${ctx.owner}/${ctx.repo}`.toLowerCase();
        let changed: AuditRunRow[] = [];
        if (pr.state !== 'open' || pr.draft || !sameRepo) {
          changed = await tx.$queryRaw<AuditRunRow[]>`
            update public.audit_runs set cancel_requested=true,
              status=case when status='queued' then 'cancelled' else status end,
              stage=case when status='queued' then 'cancelled' else stage end,
              completed_at=case when status='queued' then now() else completed_at end, updated_at=now()
            where pr_id=${ctx.pr_id}::uuid and status in ('queued','running') returning *
          `;
        } else {
          const { profile, enabled } = await eligibility(ctx);
          const supported = new Set(['opened', 'reopened', 'synchronize', 'ready_for_review']).has(payload.action);
          if (enabled && profile && supported) {
            changed = [await enqueueWithTransaction(tx, ctx, pr.base.sha, pr.head.sha, profile)];
          }
        }
        await tx.$executeRaw`
          update public.audit_webhook_deliveries set processed=true where delivery_id=${deliveryId}
        `;
        return changed;
      }, { maxWait: 10_000, timeout: 20_000 });
      await Promise.all(emitted.map(publishAudit));
    } catch (error) {
      throw error;
    }
  },
};
