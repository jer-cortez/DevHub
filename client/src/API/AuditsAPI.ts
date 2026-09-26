import { apiRequest } from "./apiClient";

export type AuditStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "superseded";

export type AuditSeverity = "low" | "medium" | "high" | "critical";

export interface AuditFinding {
  id: string;
  severity: AuditSeverity;
  category: string;
  path: string;
  line: number | null;
  title: string;
  explanation: string;
  evidence: string;
  verification: "static" | "reproduced" | "unverified";
  patch?: string;
}

export interface AuditCheck {
  revision: string;
  name: string;
  exit_code: number | null;
  output: string;
  timed_out: boolean;
}

export interface AuditPatch {
  patch: string;
  verified: boolean;
  checks: AuditCheck[];
}

export interface AuditRun {
  id: string;
  status: AuditStatus;
  stage: string | null;
  head_sha: string;
  base_sha: string;
  created_at: string;
  updated_at: string;
  github_review_url: string | null;
  error: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    model_calls: number;
  } | null;
  result: {
    summary: string;
    limitations: string[];
    findings: AuditFinding[];
    checks: AuditCheck[];
    patches: AuditPatch[];
    coverage: unknown;
  } | null;
}

export interface PullRequestAudits {
  enabled: boolean;
  runs: AuditRun[];
}

export type AuditFeedbackVerdict = "useful" | "incorrect";

export const AuditsAPI = {
  findByPullRequest: (prId: string) =>
    apiRequest<PullRequestAudits>(`/api/pull-requests/${prId}/audits`),
  findById: (auditId: string) => apiRequest<AuditRun>(`/api/audits/${auditId}`),
  start: (prId: string) =>
    apiRequest<AuditRun>(`/api/pull-requests/${prId}/audits`, { method: "POST" }),
  cancel: (auditId: string) =>
    apiRequest<AuditRun>(`/api/audits/${auditId}/cancel`, { method: "POST" }),
  submitFeedback: (auditId: string, findingId: string, verdict: AuditFeedbackVerdict) =>
    apiRequest<unknown>(`/api/audits/${auditId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finding_id: findingId, verdict }),
    }),
};

export const pullRequestAuditsKey = (prId: string) => ["pull-request-audits", prId] as const;
export const auditRunKey = (auditId: string) => ["audit-run", auditId] as const;

export function isActiveAudit(run: AuditRun) {
  return run.status === "queued" || run.status === "running";
}
