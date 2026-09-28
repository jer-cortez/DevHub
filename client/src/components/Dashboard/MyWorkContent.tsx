"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { DeliveryAPI, isLead, tasksKey, workspaceKey } from "@/API/DeliveryAPI";
import { RepositoriesAPI, repositoriesKey } from "@/API/RepositoriesAPI";
import { RepoFollowersAPI, myFollowsKey } from "@/API/RepoFollowersAPI";
import { PullRequestsAPI } from "@/API/PullRequestsAPI";

export default function MyWorkContent() {
  const [includeFollowing, setIncludeFollowing] = useState(false);
  const { data: me, error: meError, isLoading: meLoading } = useSWR(workspaceKey, DeliveryAPI.me);
  const repoId = me?.active ? me.team?.repoId : undefined;
  const { data: repos } = useSWR(me?.active ? repositoriesKey : null, RepositoriesAPI.findAll);
  const { data: tasks, error: taskError, isLoading: taskLoading } = useSWR(
    repoId ? tasksKey(repoId) : null, () => DeliveryAPI.tasks(repoId!),
  );
  const { data: follows, error: followError, isLoading: followLoading } = useSWR(
    me?.active ? myFollowsKey : null, RepoFollowersAPI.findMine,
  );
  const repoIds = [...new Set([
    ...(repoId ? [repoId] : []),
    ...(includeFollowing ? (follows ?? []).map(f => f.repo_id) : []),
  ])].sort();
  const { data: feed, error: feedError, isLoading: feedLoading } = useSWR(
    repoIds.length ? ["workspace-pr-feed", ...repoIds] : null,
    async () => (await Promise.all(repoIds.map(async id => ({
      repoId: id, prs: await PullRequestsAPI.findByRepoId(id),
    })))).flatMap(group => group.prs
      .filter(pr => pr.status === "open")
      .map(pr => ({ ...pr, repoId: group.repoId }))),
  );
  const assigned = tasks?.filter(t => t.assignee_id === me?.userId && t.status !== "done") ?? [];
  const lead = !!repoId && isLead(me, repoId);
  const reviews = tasks?.filter(t => t.status === "in_review" && (lead || t.assignee_id === me?.userId)) ?? [];

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-semibold">My work</h1>
        <p className="text-neutral-500">Your team&apos;s tasks and pull requests</p>
      </header>
      {meLoading && <p>Loading your workspace…</p>}
      {meError && <p role="alert">Could not load your workspace: {meError.message}</p>}
      {me && !me.active && <p role="alert">Ask an administrator to activate your workspace membership.</p>}
      {me?.active && !repoId && (
        <p>Your lead or an administrator can assign you to a team. <Link href="/dashboard/teams" className="underline">View teams</Link></p>
      )}
      {repoId && (
        <>
          <p><Link className="underline" href={`/dashboard/repositories/${repoId}/tasks`}>
            {repos?.find(r => r.id === repoId)?.name ?? "My team"} tasks
          </Link></p>
          {taskLoading && <p>Loading tasks…</p>}
          {taskError && <p role="alert">Could not load tasks: {taskError.message}</p>}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Assigned to me</h2>
            {tasks && assigned.length === 0 && <p>No open tasks assigned to you.</p>}
            {assigned.map(task => (
              <Link className="block rounded border border-neutral-200 p-3 dark:border-neutral-800" key={task.id} href={`/dashboard/repositories/${repoId}/tasks/${task.id}`}>
                {task.title} <small>· {task.status.replaceAll("_", " ")}</small>
              </Link>
            ))}
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">{lead ? "Awaiting your team's approval" : "My tasks awaiting approval"}</h2>
            {tasks && reviews.length === 0 && <p>No tasks awaiting review.</p>}
            {reviews.map(task => (
              <Link className="block rounded border border-neutral-200 p-3 dark:border-neutral-800" key={task.id} href={`/dashboard/repositories/${repoId}/tasks/${task.id}`}>{task.title}</Link>
            ))}
          </section>
        </>
      )}
      {me?.active && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Open pull requests</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeFollowing} onChange={event => setIncludeFollowing(event.target.checked)} />
            Include repositories I follow
          </label>
          <Link href="/dashboard/teams" className="text-sm underline">Manage followed repositories</Link>
          {includeFollowing && followLoading && <p>Loading followed repositories…</p>}
          {includeFollowing && followError && <p role="alert">Could not load followed repositories.</p>}
          {feedLoading && <p>Loading pull requests…</p>}
          {feedError && <p role="alert">Could not load pull requests: {feedError.message}</p>}
          {!repoIds.length && !followLoading && <p>Select a team or follow a repository to see its pull requests.</p>}
          {feed && !feed.length && <p>No open pull requests in the selected repositories.</p>}
          {feed?.map(pr => (
            <a className="block rounded border border-neutral-200 p-3 dark:border-neutral-800" key={pr.id} href={pr.github_url} target="_blank" rel="noopener noreferrer">
              {repos?.find(r => r.id === pr.repoId)?.name ?? "Repository"} #{pr.github_pr_number}: {pr.title}
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
