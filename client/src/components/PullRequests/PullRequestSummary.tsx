"use client";

import { useState } from "react";
import { PullRequestsAPI, type PullRequestSummary as Summary } from "@/API/PullRequestsAPI";

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current">
      <path d="M8 1.5l1.4 3.6L13 6.5l-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5ZM12.5 10l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </svg>
  );
}

/**
 * Deliberately not fetched with SWR on mount — generating a summary costs
 * money, so it only happens when someone actually asks for one. The server
 * returns a stored summary when the PR hasn't changed since it was written,
 * which makes repeat clicks free.
 */
export default function PullRequestSummary({ prId }: { prId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (summary) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSummary(await PullRequestsAPI.summarize(prId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleExplain}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
      >
        <SparkleIcon />
        {loading ? "Reading the diff..." : summary ? "Hide explanation" : "Explain this PR"}
      </button>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <div className="mt-2 space-y-2 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">{summary.summary}</p>

          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              How this fits into the repo
            </p>
            <p className="text-sm text-neutral-800 dark:text-neutral-200">{summary.impact}</p>
          </div>

          {/* The reader needs to know the summary is partial — a confident
              paragraph about a 60-file PR written from 20 files is the main
              way this feature can mislead someone. */}
          {summary.truncated && (
            <p className="text-xs text-amber-700 dark:text-amber-500">
              Based on the largest changed files only — some of this PR was not read.
            </p>
          )}

          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            AI-generated ({summary.model}) — verify against the diff before relying on it.
          </p>
        </div>
      )}
    </div>
  );
}
