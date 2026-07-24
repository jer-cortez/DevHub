"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    apiFetch("/api/repositories/all")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? `Request failed (${res.status})` });
          return;
        }
        setState({ status: "ready", repositories: body.data });
      })
      .catch((err) => setState({ status: "error", message: err.message }));
  }, []);

  if (state.status === "loading") {
    return <p className="text-sm text-neutral-500">Loading repositories...</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  if (state.repositories.length === 0) {
    return <p className="text-sm text-neutral-500">No repositories found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {state.repositories.map((repo) => (
        <div
          key={repo.id}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-2"
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
        </div>
      ))}
    </div>
  );
}
