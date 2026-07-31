"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface OrgMember {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; members: OrgMember[] };

export default function PeopleList() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await apiFetch("/api/org-members/members");
      const body = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: body.error ?? `Request failed (${res.status})` });
        return;
      }
      setState({ status: "ready", members: body.data });
    } catch (err: any) {
      setState({ status: "error", message: err.message });
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await apiFetch("/api/org-members/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setSyncError(body.error ?? `Sync failed (${res.status})`);
        return;
      }
      await loadMembers();
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
        <p className="text-sm text-neutral-500">Loading members...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.members.length === 0 && (
        <p className="text-sm text-neutral-500">No members found. Try syncing from GitHub.</p>
      )}

      {state.status === "ready" && state.members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
            >
              {member.user.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.user.avatar_url}
                  alt={member.user.username}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{member.user.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
