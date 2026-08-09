"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  PrDependenciesAPI,
  prDependenciesKey,
  type LinkedPr,
} from "@/API/PrDependenciesAPI";
import { PullRequestsAPI, type PullRequest } from "@/API/PullRequestsAPI";

function BlockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 1.5a6.5 6.5 0 0 0-5.02 10.61l9.13-9.13A6.47 6.47 0 0 0 8 1.5Zm5.02 2.39-9.13 9.13A6.5 6.5 0 0 0 13.02 3.89Z" />
    </svg>
  );
}

/** Blocker status drives the colour: unmerged blocks, closed is a dead link, merged is satisfied. */
function statusLabel(status: string): { text: string; className: string } {
  if (status === "merged")
    return { text: "merged", className: "text-emerald-600 dark:text-emerald-400" };
  if (status === "closed")
    return { text: "closed without merging", className: "text-red-600 dark:text-red-400" };
  return { text: "not yet merged", className: "text-amber-600 dark:text-amber-500" };
}

function LinkedRow({
  pr,
  onRemove,
  removing,
}: {
  pr: LinkedPr;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const status = statusLabel(pr.status);
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0 text-sm">
        <span className="text-neutral-400 dark:text-neutral-600 font-mono mr-1.5">└──</span>
        <a
          href={pr.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          #{pr.github_pr_number}
        </a>{" "}
        <span className="text-neutral-600 dark:text-neutral-300">({pr.repo_name})</span>{" "}
        <span className={status.className}>— {status.text}</span>
        {pr.note && (
          <p className="ml-7 text-xs text-neutral-500 dark:text-neutral-400 italic">{pr.note}</p>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          title="Remove this dependency"
          className="shrink-0 text-xs text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function PullRequestDependencies({
  prId,
  prNumber,
  onChange,
}: {
  prId: string;
  prNumber: number;
  /** Lets the parent list refresh its blocked badges after a link changes. */
  onChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, mutate } = useSWR(open ? prDependenciesKey(prId) : null, () =>
    PrDependenciesAPI.getForPr(prId)
  );

  // Only loaded once the picker is open — the whole-org PR list is a big
  // response to fetch for a card nobody has interacted with.
  const { data: allPrs } = useSWR<PullRequest[]>(adding ? ["all-prs"] : null, () =>
    PullRequestsAPI.findAll()
  );

  const alreadyLinked = new Set(data?.blockedBy.map((b) => b.pr_id) ?? []);
  const candidates = (allPrs ?? []).filter(
    (pr) => pr.id !== prId && !alreadyLinked.has(pr.id) && pr.status !== "merged"
  );

  const refresh = () => {
    mutate();
    onChange?.();
  };

  const handleLink = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await PrDependenciesAPI.link(prId, selected, note || undefined);
      setSelected("");
      setNote("");
      setAdding(false);
      refresh();
    } catch (err) {
      // Cycle and self-block rejections come back as 400s with a readable
      // explanation — surface it verbatim rather than a generic failure.
      setError(err instanceof Error ? err.message : "Could not add dependency");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (dependencyId: string) => {
    setBusy(true);
    try {
      await PrDependenciesAPI.unlink(dependencyId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove dependency");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <BlockIcon />
        {open ? "Hide dependencies" : "Dependencies"}
      </button>

      {open && data && (
        <div className="mt-2 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Blocked by
            </p>
            {data.blockedBy.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Nothing — this PR is free to merge.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium">PR #{prNumber}</p>
                {data.blockedBy.map((pr) => (
                  <LinkedRow
                    key={pr.dependency_id}
                    pr={pr}
                    removing={busy}
                    onRemove={() => handleUnlink(pr.dependency_id)}
                  />
                ))}
              </>
            )}
          </div>

          {data.abandonedBlockers.length > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {data.abandonedBlockers.length} blocker
              {data.abandonedBlockers.length === 1 ? " was" : "s were"} closed without merging — this
              dependency will never resolve on its own. Remove the link or reopen the blocker.
            </p>
          )}

          {data.blocking.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Blocking ({data.blocking.length})
              </p>
              {data.blocking.map((pr) => (
                <LinkedRow key={pr.dependency_id} pr={pr} />
              ))}
            </div>
          )}

          {adding ? (
            <div className="space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
              >
                <option value="">
                  {allPrs ? "Select the PR this one waits on..." : "Loading pull requests..."}
                </option>
                {candidates.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    #{pr.github_pr_number} {pr.title}
                  </option>
                ))}
              </select>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why? (optional)"
                className="w-full text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleLink}
                  disabled={!selected || busy}
                  className="text-xs rounded-md px-2 py-1 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
                >
                  {busy ? "Linking..." : "Add blocker"}
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add a blocker
            </button>
          )}

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Advisory only — GitHub&apos;s merge button is not affected.
          </p>
        </div>
      )}
    </div>
  );
}
