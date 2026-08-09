"use client";

import { useState } from "react";
import useSWR from "swr";
import { RepositoriesAPI, repositoriesKey } from "@/API/RepositoriesAPI";
import { TeamsAPI, myTeamKey, teamByRepoKey } from "@/API/TeamsAPI";
import { RepoFollowersAPI, myFollowsKey } from "@/API/RepoFollowersAPI";
import FollowControls from "./FollowControls";
import ReviewSuggestionsToggle from "./ReviewSuggestionsToggle";

export default function TeamsContent() {
  const { data: repositories = [] } = useSWR(repositoriesKey, RepositoriesAPI.findAll);
  const { data: membership, mutate: mutateMembership } = useSWR(myTeamKey, TeamsAPI.findMine);
  const { data: follows = [], mutate: mutateFollows } = useSWR(myFollowsKey, RepoFollowersAPI.findMine);

  const [busyRepoId, setBusyRepoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shares the same SWR key the repo page uses, so joining here and viewing
  // the roster there never disagree.
  const { data: teammates = [], mutate: mutateTeammates } = useSWR(
    membership ? teamByRepoKey(membership.repo_id) : null,
    () => TeamsAPI.findByRepoId(membership!.repo_id)
  );

  const followsByRepoId = new Map(follows.map((f) => [f.repo_id, f]));
  const currentRepo = repositories.find((r) => r.id === membership?.repo_id) ?? null;

  const runAction = async (repoId: string, action: () => Promise<unknown>) => {
    setBusyRepoId(repoId);
    setError(null);
    try {
      await action();
      await Promise.all([mutateMembership(), mutateTeammates()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyRepoId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Teams</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Join the repository you&apos;re working on to get its activity in your notifications.
          You can be on one team at a time — joining another moves you. Follow other
          repositories to keep an eye on them without joining.
        </p>
      </div>

      <ReviewSuggestionsToggle />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Your team
        </h2>
        {currentRepo ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{currentRepo.name}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {currentRepo.description}
                </p>
              </div>
              <button
                onClick={() => runAction(currentRepo.id, () => TeamsAPI.leave())}
                disabled={busyRepoId === currentRepo.id}
                className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                Leave
              </button>
            </div>

            {teammates.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {teammates.length} {teammates.length === 1 ? "person" : "people"}:
                </span>
                <div className="flex -space-x-2">
                  {teammates.map((member) => (
                    <img
                      key={member.id}
                      src={member.user.avatar_url ?? undefined}
                      alt={member.user.username}
                      title={member.user.username}
                      className="h-6 w-6 rounded-full border-2 border-white dark:border-neutral-900"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            You haven&apos;t joined a team yet. Pick the repository you&apos;re working on below.
          </p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
          All repositories
        </h2>

        {repositories.length === 0 && (
          <p className="text-sm text-neutral-500">
            No repositories yet. Sync from GitHub on the Repositories tab first.
          </p>
        )}

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
          {repositories.map((repo) => {
            const isMine = membership?.repo_id === repo.id;
            return (
              <div key={repo.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{repo.name}</p>
                    {isMine && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                        Your team
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                    {repo.description}
                  </p>

                  <FollowControls
                    repoId={repo.id}
                    follow={followsByRepoId.get(repo.id) ?? null}
                    onChanged={mutateFollows}
                  />
                </div>

                <button
                  onClick={() =>
                    runAction(repo.id, () => (isMine ? TeamsAPI.leave() : TeamsAPI.join(repo.id)))
                  }
                  disabled={busyRepoId === repo.id}
                  className={
                    isMine
                      ? "shrink-0 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                      : "shrink-0 text-sm rounded-md px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
                  }
                >
                  {busyRepoId === repo.id ? "..." : isMine ? "Leave team" : "Join team"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
