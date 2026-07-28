"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Repository {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  default_branch: string;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; repositories: Repository[] };

export default function RepositoriesList() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadRepositories = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await apiFetch("/api/repositories/all");
      const body = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: body.error ?? `Request failed (${res.status})` });
        return;
      }
      setState({ status: "ready", repositories: body.data });
    } catch (err: any) {
      setState({ status: "error", message: err.message });
    }
  }, []);

  useEffect(() => {
    loadRepositories();
  }, [loadRepositories]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await apiFetch("/api/repositories/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setSyncError(body.error ?? `Sync failed (${res.status})`);
        return;
      }
      await loadRepositories();
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
        <p className="text-sm text-neutral-500">Loading repositories...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.repositories.length === 0 && (
        <p className="text-sm text-neutral-500">No repositories found. Try syncing from GitHub.</p>
      )}

      {state.status === "ready" && state.repositories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.repositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/dashboard/repositories/${repo.id}/pull-requests`}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-2 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{repo.name}</h3>
                <span
                  className={
                    repo.is_private
                      ? "text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  }
                >
                  {repo.is_private ? "Private" : "Public"}
                </span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{repo.description}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-600">
                Default branch: {repo.default_branch}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
