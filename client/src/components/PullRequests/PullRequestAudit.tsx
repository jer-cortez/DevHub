"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AuditsAPI,
  auditRunKey,
  isActiveAudit,
  pullRequestAuditsKey,
  type AuditCheck,
  type AuditFeedbackVerdict,
  type AuditFinding,
  type AuditRun,
} from "@/API/AuditsAPI";

const STATUS_STYLES: Record<AuditRun["status"], string> = {
  queued: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  superseded: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const SEVERITY_STYLES: Record<AuditFinding["severity"], string> = {
  low: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function shortSha(sha: string) {
  return sha ? sha.slice(0, 7) : "unknown";
}

function formatCoverage(coverage: unknown) {
  if (typeof coverage === "string" || typeof coverage === "number") return String(coverage);
  if (coverage && typeof coverage === "object") return JSON.stringify(coverage);
  return "Not reported";
}

function formatRunLabel(run: AuditRun) {
  return `${new Date(run.created_at).toLocaleString()} · ${shortSha(run.head_sha)} · ${run.status}`;
}

function CheckResult({ check }: { check: AuditCheck }) {
  const failed = check.timed_out || (check.exit_code !== null && check.exit_code !== 0);
  return (
    <details className="rounded border border-neutral-200 dark:border-neutral-700 px-2 py-1.5">
      <summary className="cursor-pointer text-xs font-medium">
        <span className={failed ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
          {failed ? "Failed" : "Passed"}
        </span>{" "}
        {check.name}
        {check.timed_out ? " (timed out)" : check.exit_code !== null ? ` (exit ${check.exit_code})` : ""}
      </summary>
      {check.revision && <p className="mt-1 text-xs text-neutral-500">Revision {shortSha(check.revision)}</p>}
      {check.output && (
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-950 p-2 text-xs text-neutral-100">
          {check.output}
        </pre>
      )}
    </details>
  );
}

function Finding({
  auditId,
  finding,
}: {
  auditId: string;
  finding: AuditFinding;
}) {
  const [feedback, setFeedback] = useState<AuditFeedbackVerdict | null>(null);
  const [sending, setSending] = useState<AuditFeedbackVerdict | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function submit(verdict: AuditFeedbackVerdict) {
    setSending(verdict);
    setFeedbackError(null);
    try {
      await AuditsAPI.submitFeedback(auditId, finding.id, verdict);
      setFeedback(verdict);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setSending(null);
    }
  }

  return (
    <article className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${SEVERITY_STYLES[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{finding.category}</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {finding.path}{finding.line === null ? "" : `:${finding.line}`}
        </span>
        <span className="ml-auto text-xs text-neutral-400">{finding.verification}</span>
      </div>
      <h4 className="mt-2 text-sm font-semibold">{finding.title}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
        {finding.explanation}
      </p>
      {finding.evidence && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Evidence</p>
          <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-100 p-2 text-xs text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
            {finding.evidence}
          </pre>
        </div>
      )}
      {finding.patch && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Suggested patch
          </summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-950 p-2 text-xs text-neutral-100">
            {finding.patch}
          </pre>
        </details>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-neutral-500">Was this useful?</span>
        {(["useful", "incorrect"] as const).map((verdict) => (
          <button
            key={verdict}
            type="button"
            disabled={sending !== null}
            onClick={() => submit(verdict)}
            className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${
              feedback === verdict
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {sending === verdict ? "Saving..." : verdict === "useful" ? "Useful" : "Incorrect"}
          </button>
        ))}
        {feedback && <span className="text-xs text-emerald-700 dark:text-emerald-400">Saved</span>}
      </div>
      {feedbackError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{feedbackError}</p>}
    </article>
  );
}

function RunDetails({ run }: { run: AuditRun }) {
  const result = run.result;
  const limitations = Array.isArray(result?.limitations) ? result.limitations : [];
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  const checks = Array.isArray(result?.checks) ? result.checks : [];
  const patches = Array.isArray(result?.patches) ? result.patches : [];
  const usage = run.usage;
  const hasDetails = Boolean(
    result?.summary || limitations.length || findings.length || checks.length || patches.length
  );

  if (!hasDetails) {
    return (
      <div className="mt-3 space-y-2">
        {isActiveAudit(run) && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            Audit {run.status}{run.stage ? ` · ${run.stage}` : ""}. This view updates automatically.
          </div>
        )}
        {run.error && <p className="text-sm text-red-600 dark:text-red-400">{run.error}</p>}
        {!isActiveAudit(run) && (
          <p className="text-sm text-neutral-500">No audit result is available for this run.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {isActiveAudit(run) && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          Audit {run.status}{run.stage ? ` · ${run.stage}` : ""}. This view updates automatically.
        </div>
      )}
      {run.error && <p className="text-sm text-red-600 dark:text-red-400">{run.error}</p>}
      {result?.summary && (
        <p className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">{result.summary}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Coverage: {formatCoverage(result?.coverage)}</span>
        {usage && typeof usage.model_calls === "number" && (
          <>
            <span>{usage.model_calls.toLocaleString()} model calls</span>
            <span>{usage.input_tokens.toLocaleString()} input tokens</span>
            <span>{usage.output_tokens.toLocaleString()} output tokens</span>
          </>
        )}
      </div>

      {limitations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Limitations</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
            {limitations.map((limitation, index) => <li key={`${index}-${limitation}`}>{limitation}</li>)}
          </ul>
        </div>
      )}

      {(Boolean(result?.summary) || findings.length > 0) && <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Findings ({findings.length})
        </h4>
        {findings.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">No findings reported.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {findings.map((finding) => (
              <Finding key={`${run.id}-${finding.id}`} auditId={run.id} finding={finding} />
            ))}
          </div>
        )}
      </div>}

      {checks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Test results</h4>
          <div className="mt-2 space-y-2">
            {checks.map((check, index) => <CheckResult key={`${check.name}-${index}`} check={check} />)}
          </div>
        </div>
      )}

      {patches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Suggested patches</h4>
          <div className="mt-2 space-y-2">
            {patches.map((patch, index) => (
              <details key={index} className="rounded border border-neutral-200 p-2 dark:border-neutral-700">
                <summary className="cursor-pointer text-xs font-medium">
                  Patch {index + 1} · {patch.verified ? "verified" : "not verified"}
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-950 p-2 text-xs text-neutral-100">
                  {patch.patch}
                </pre>
                {patch.checks.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {patch.checks.map((check, checkIndex) => (
                      <CheckResult key={`${check.name}-${checkIndex}`} check={check} />
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      )}

      {run.github_review_url && (
        <a
          href={run.github_review_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View GitHub review
        </a>
      )}
    </div>
  );
}

export default function PullRequestAudit({ prId, canStart }: { prId: string; canStart: boolean }) {
  const [open, setOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [action, setAction] = useState<"start" | "cancel" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    open ? pullRequestAuditsKey(prId) : null,
    () => AuditsAPI.findByPullRequest(prId),
    {
      refreshInterval: (latest) => latest?.runs.some(isActiveAudit) ? 3000 : 0,
    }
  );

  const selectedRunSummary = useMemo(
    () => data?.runs.find((run) => run.id === selectedRunId) ?? data?.runs[0] ?? null,
    [data, selectedRunId]
  );
  const activeRun = data?.runs.find(isActiveAudit) ?? null;
  const {
    data: selectedRun,
    error: detailError,
    isLoading: detailLoading,
  } = useSWR(
    open && selectedRunSummary ? auditRunKey(selectedRunSummary.id) : null,
    () => AuditsAPI.findById(selectedRunSummary!.id),
    {
      refreshInterval: (latest) =>
        isActiveAudit(latest ?? selectedRunSummary!) ? 3000 : 0,
    }
  );
  const displayedRun = selectedRun ?? selectedRunSummary;

  async function startAudit() {
    setAction("start");
    setActionError(null);
    try {
      const run = await AuditsAPI.start(prId);
      setSelectedRunId(run.id);
      await mutate((current) => current ? { ...current, runs: [run, ...current.runs.filter((item) => item.id !== run.id)] } : current, {
        revalidate: true,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not start audit");
    } finally {
      setAction(null);
    }
  }

  async function cancelAudit() {
    if (!activeRun) return;
    setAction("cancel");
    setActionError(null);
    try {
      const cancelled = await AuditsAPI.cancel(activeRun.id);
      await mutate((current) => current ? {
        ...current,
        runs: current.runs.map((run) => run.id === cancelled.id ? cancelled : run),
      } : current, { revalidate: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not cancel audit");
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <span aria-hidden="true">⌕</span>
        {open ? "Hide audit" : "Audit PR"}
        {activeRun && <span className="text-blue-600 dark:text-blue-400">· {activeRun.status}</span>}
      </button>

      {open && (
        <section className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading && <p className="text-sm text-neutral-500">Loading audit history...</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>}

          {data && !data.enabled && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Audits are disabled for this repository. Ask an administrator to configure the audit service.
            </p>
          )}

          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {data.enabled && canStart && (
                  <button
                    type="button"
                    onClick={startAudit}
                    disabled={action !== null || activeRun !== null}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    {action === "start" ? "Starting..." : activeRun ? "Audit in progress" : "Start audit"}
                  </button>
                )}
                {activeRun && (
                  <button
                    type="button"
                    onClick={cancelAudit}
                    disabled={action !== null}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    {action === "cancel" ? "Cancelling..." : "Cancel"}
                  </button>
                )}
                {data.runs.length > 0 && (
                  <label className="ml-auto flex min-w-0 items-center gap-2 text-xs text-neutral-500">
                    History
                    <select
                      value={selectedRunSummary?.id ?? ""}
                      onChange={(event) => setSelectedRunId(event.target.value)}
                      className="max-w-64 rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                    >
                      {data.runs.map((run) => <option key={run.id} value={run.id}>{formatRunLabel(run)}</option>)}
                    </select>
                  </label>
                )}
              </div>

              {actionError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</p>}

              {data.runs.length === 0 && (
                <p className="mt-3 text-sm text-neutral-500">No audits have been run for this pull request.</p>
              )}

              {displayedRun && (
                <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[displayedRun.status]}`}>
                      {displayedRun.status}
                    </span>
                    {displayedRun.stage && <span className="text-xs text-neutral-500">{displayedRun.stage}</span>}
                    <span className="text-xs text-neutral-400">
                      {shortSha(displayedRun.base_sha)} → {shortSha(displayedRun.head_sha)}
                    </span>
                  </div>
                  {detailLoading && (
                    <p className="mt-3 text-sm text-neutral-500">Loading full audit details...</p>
                  )}
                  {detailError && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {(detailError as Error).message}
                    </p>
                  )}
                  {selectedRun && <RunDetails key={selectedRun.id} run={selectedRun} />}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
