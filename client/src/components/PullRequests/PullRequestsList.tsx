"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PullRequestsAPI, type PullRequest } from "@/API/PullRequestsAPI";
import { ReviewCommentsAPI } from "@/API/ReviewCommentsAPI";
import { useRepoEvents, type RepoEvent } from "@/hooks/useRepoEvents";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pullRequests: PullRequest[] };

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  merged: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function PullRequestsList({ repoId }: { repoId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const loadPullRequests = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const pullRequests = await PullRequestsAPI.findByRepoId(repoId);
      setState({ status: "ready", pullRequests });

      // Fetch initial comment counts in one request, rather than one per PR.
      if (pullRequests.length > 0) {
        const counts = await ReviewCommentsAPI.countsByPrIds(pullRequests.map((pr) => pr.id));
        setCommentCounts(counts);
      }
    } catch (err: any) {
      setState({ status: "error", message: err.message });
    }
  }, [repoId]);

  useEffect(() => {
    loadPullRequests();
  }, [loadPullRequests]);

  // useRepoEvents re-subscribes whenever this callback identity changes, so
  // it's kept stable via a ref rather than depending on `loadPullRequests`
  // (which itself changes identity on every repoId change already handled
  // by useRepoEvents's own dependency on repoId).
  const loadPullRequestsRef = useRef(loadPullRequests);
  loadPullRequestsRef.current = loadPullRequests;

  const handleRepoEvent = useCallback((event: RepoEvent) => {
    if (event.type === "pull_request") {
      loadPullRequestsRef.current();
    } else if (event.type === "comment") {
      const comment = event.data as { pr_id: string };
      setCommentCounts((prev) => ({
        ...prev,
        [comment.pr_id]: (prev[comment.pr_id] ?? 0) + 1,
      }));
    }
  }, []);

  useRepoEvents(repoId, handleRepoEvent);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await PullRequestsAPI.syncFromGithub(repoId);
      await loadPullRequests();
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-sm rounded-md px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync from GitHub"}
        </button>
        {syncError && <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>}
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-neutral-500">Loading pull requests...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.pullRequests.length === 0 && (
        <p className="text-sm text-neutral-500">No pull requests found. Try syncing from GitHub.</p>
      )}

      {state.status === "ready" && state.pullRequests.length > 0 && (
        <div className="space-y-2">
          {state.pullRequests.map((pr) => (
            <a
              key={pr.id}
              href={pr.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  #{pr.github_pr_number} {pr.title}
                </h3>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[pr.status] ?? STATUS_STYLES.open}`}
                >
                  {pr.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-neutral-400 dark:text-neutral-600">
                  {pr.base_branch} ← {pr.head_branch}
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-600">
                  💬 {commentCounts[pr.id] ?? 0}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
