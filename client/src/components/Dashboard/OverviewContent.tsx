"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { OrganizationsAPI,organizationReadmeKey } from "@/API/OrganizationsAPI";
import { RepositoriesAPI,repositoriesKey,repositoriesActivityKey } from "@/API/RepositoriesAPI";
import { OrgHealthAPI,orgHealthKey } from "@/API/OrgHealthAPI";
import NotificationsFeed from "@/components/Notifications/NotificationsFeed";
import ReadmeMarkdown from "@/components/Common/ReadmeMarkdown";
import RepoSparkline from "./RepoSparkline";
import WorkspaceIcon,{ type WorkspaceIconName } from "./WorkspaceIcon";
import { timeAgo } from "@/lib/timeAgo";

export default function OverviewContent() {
  const { data: repositories,error: repoError,mutate: refreshRepos }=useSWR(repositoriesKey,RepositoriesAPI.findAll);
  const { data: activity,error: activityError,mutate: refreshActivity }=useSWR(repositoriesActivityKey,RepositoriesAPI.listActivity);
  const { data: health,error: healthError,mutate: refreshHealth }=useSWR(orgHealthKey,OrgHealthAPI.getDashboard,{ refreshInterval: 60000 });
  const { data: readme }=useSWR(organizationReadmeKey,OrganizationsAPI.getReadme);
  const [syncing,setSyncing]=useState(false);
  const [syncMessage,setSyncMessage]=useState("");
  const activityById=new Map((activity??[]).map(item => [item.repoId,item]));
  const orderedRepos=[...(repositories??[])].sort((a,b) => (Date.parse(activityById.get(b.id)?.pushedAt??"")||0)-(Date.parse(activityById.get(a.id)?.pushedAt??"")||0));
  const featuredRepo=orderedRepos[0];
  const stale=health?.stalePrs??[];
  const blocked=health?.blockedPrs??[];
  const blockedIds=new Set(blocked.map(pr => pr.id));
  const attention=[
    ...blocked.map(pr => ({ id: pr.id,title: pr.title,repo: pr.repo_name,number: pr.github_pr_number,url: pr.github_url,status: "Blocked",tone: "red",icon: "branch" as const,detail: `Blocked by ${pr.blockers.map(b => `${b.repo_name} #${b.github_pr_number}`).join(", ")}`,value: `${pr.blocker_count} blocker${pr.blocker_count===1? "":"s"}` })),
    ...stale.filter(pr => !blockedIds.has(pr.id)).map(pr => ({ id: pr.id,title: pr.title,repo: pr.repo_name,number: pr.github_pr_number,url: pr.github_url,status: "Stale",tone: "amber",icon: "clock" as const,detail: `No activity for ${pr.days_stale} days`,value: `${pr.days_stale}d idle` })),
  ];
  const reviewers=[...(health?.reviewerLoad??[])].sort((a,b) => b.pending_count-a.pending_count).slice(0,4);
  const metrics: { label: string; value: number|undefined; detail: string; tone: string; icon: WorkspaceIconName }[]=[
    { label: "Stale pull requests",value: health?.summary.stalePrs,detail: health? `No activity in ${health.thresholds.stalePrDays}+ days`:"Review activity",tone: "amber",icon: "clock" },
    { label: "Blocked pull requests",value: health?.summary.blockedPrs,detail: "Waiting on a dependency",tone: "red",icon: "branch" },
    { label: "Reviewer bottlenecks",value: health?.summary.overloadedReviewers,detail: health? `${health.thresholds.reviewerOverload}+ pending requests`:"Pending review requests",tone: "blue",icon: "people" },
  ];
  async function syncRepositories() {
    setSyncing(true);
    setSyncMessage("");
    try {
      const result=await RepositoriesAPI.syncFromGithub();
      await refreshRepos(result,{ revalidate: false });
      await Promise.all([refreshActivity(),refreshHealth()]);
      setSyncMessage("Repository list synced. Sync PRs inside a repository to refresh its reviews.");
    } catch(error) {
      setSyncMessage(error instanceof Error? error.message:"Sync failed. Please try again.");
    } finally { setSyncing(false); }
  }
  return <div className="ws-overview">
    <section className="ws-intro">
      <div><p className="ws-eyebrow"><span className="ws-dot" />Your engineering workspace</p><h1>Keep good work moving.</h1><p>{health? attention.length? "Your organization has a few review bottlenecks. Start with the blocked work below.":"A clear view of your reviews, repositories, and team activity.":"Everything your team needs to move code reviews forward."}</p></div>
      <button className="ws-button" onClick={syncRepositories} disabled={syncing}><span className={syncing? "ws-spinning":""}><WorkspaceIcon name="sync" size={17} /></span>{syncing? "Syncing…":"Sync repositories"}</button>
    </section>
    {syncMessage&&<p className="ws-notice" role="status">{syncMessage}</p>}
    <div className="ws-metrics">{metrics.map(metric => <Link href="/dashboard/health" className="ws-metric" key={metric.label}><span className={`ws-icon-box ${metric.tone}`}><WorkspaceIcon name={metric.icon} size={23} /></span><div><strong><span>{metric.value??"—"}</span>{metric.label}</strong><small>{metric.detail}</small></div><WorkspaceIcon name="arrow" size={16} /></Link>)}</div>
    <section className="ws-card">
      <div className="ws-card-heading"><div><h2>Needs attention</h2><p>Blocked work first, then pull requests waiting for activity</p></div><Link className="ws-text-link" href="/dashboard/health">View health <WorkspaceIcon name="arrow" size={15} /></Link></div>
      {healthError? <div className="ws-empty" role="alert">Couldn’t load organization health. <button className="ws-text-link" onClick={() => void refreshHealth()}>Try again</button></div>:!health? <p className="ws-empty" role="status">Loading review health…</p>:attention.length===0? <div className="ws-empty"><strong>No blocked or stale pull requests.</strong><p>{health.summary.openPrs? "Your team is keeping work moving.":"No open PRs reported. Sync pull requests in a repository if you expect to see work here."}</p></div>:attention.slice(0,5).map(pr => <a className="ws-attention-row" href={pr.url} key={pr.id} target="_blank" rel="noopener noreferrer"><span className={`ws-icon-box ${pr.tone}`}><WorkspaceIcon name={pr.icon} /></span><div className="ws-row-content"><div className="ws-row-title"><span className={`ws-badge ${pr.tone}`}>{pr.status}</span><strong>{pr.title}</strong></div><p>{pr.repo} · #{pr.number} · {pr.detail}</p></div><span className="ws-wait"><small>STATUS</small><strong>{pr.value}</strong></span><span className="ws-external"><WorkspaceIcon name="external" size={17} /><span className="sr-only">Open on GitHub</span></span></a>)}
      {attention.length>5&&<Link className="ws-card-footer ws-text-link" href="/dashboard/health">View all {attention.length} items <WorkspaceIcon name="arrow" size={14} /></Link>}
    </section>
    <section className="ws-card">
      <div className="ws-card-heading"><div><h2>Review workload</h2><p>Pending requests and oldest wait time</p></div><Link href="/dashboard/health" className="ws-text-link">View reviewers <WorkspaceIcon name="arrow" size={15} /></Link></div>
      {healthError? <p className="ws-empty">Review workload is unavailable.</p>:!health? <p className="ws-empty">Loading reviewer workload…</p>:reviewers.length===0? <p className="ws-empty">No pending review requests reported.</p>:<div className="ws-reviewers">{reviewers.map(reviewer => {
        const overloaded=reviewer.pending_count>=health.thresholds.reviewerOverload;
        const width=Math.min(100,reviewer.pending_count/Math.max(1,health.thresholds.reviewerOverload)*100);
        return <div className="ws-reviewer" key={reviewer.user_id}><div className="ws-reviewer-info"><span className="ws-avatar">{reviewer.avatar_url? <img src={reviewer.avatar_url} alt="" />:reviewer.username.slice(0,2).toUpperCase()}</span><div><strong>{reviewer.username}</strong><small>{overloaded? "High review load":"Pending reviews"}</small></div><div className="ws-reviewer-count"><strong>{reviewer.pending_count} pending</strong><small>Oldest wait: {reviewer.oldest_wait_days}d</small></div></div><div className="ws-load-track" role="img" aria-label={`${reviewer.pending_count} pending reviews; overload threshold ${health.thresholds.reviewerOverload}`}><span className={overloaded? "amber":"blue"} style={{ width: `${width}%` }} /></div></div>;
      })}<p className="ws-workload-note">Bars show pending requests relative to the {health.thresholds.reviewerOverload}-request overload threshold.</p></div>}
    </section>
    <NotificationsFeed />
    <section className="ws-card">
      <div className="ws-card-heading"><div><h2>Active repositories</h2><p>Recently updated across your organization</p></div><Link className="ws-text-link" href="/dashboard/repositories">Browse all <WorkspaceIcon name="arrow" size={15} /></Link></div>
      {repoError? <div className="ws-empty" role="alert">Couldn’t load repositories. <button className="ws-text-link" onClick={() => void refreshRepos()}>Try again</button></div>:!repositories? <p className="ws-empty">Loading repositories…</p>:repositories.length===0? <p className="ws-empty">No repositories yet. Sync repositories to get started.</p>:orderedRepos.slice(0,4).map(repo => {
        const info=activityById.get(repo.id);
        return <Link key={repo.id} href={`/dashboard/repositories/${repo.id}/code`} className="ws-repository-row"><span className="ws-icon-box neutral"><WorkspaceIcon name="repo" /></span><div className="ws-row-content"><strong>{repo.name}</strong><p>{info?.language&&<span>{info.language} · </span>}{repo.is_private? "Private":"Public"}{info?.pushedAt? ` · Updated ${timeAgo(info.pushedAt)}`:""}</p></div><span className="ws-sparkline" title="Weekly commit activity"><RepoSparkline data={info?.weeklyCommits??[]} /></span><WorkspaceIcon name="arrow" size={16} /></Link>;
      })}
      {activityError&&<p className="ws-card-footer ws-muted">Activity data is temporarily unavailable.</p>}
    </section>
    {featuredRepo&&<section><div className="ws-section-heading"><div><h2>Explore your workspace</h2><p>Quick paths into {featuredRepo.name}</p></div><span className="ws-muted">{featuredRepo.default_branch}</span></div><div className="ws-shortcuts">{([
      { title: "Browse code",detail: "Files, branches, and documentation",segment: "code",icon: "code" },
      { title: "Pull requests",detail: "Reviews, summaries, and dependencies",segment: "pull-requests",icon: "branch" },
      { title: "Issues",detail: "Track work and conversations",segment: "issues",icon: "issue" },
      { title: "Design boards",detail: "Shared system-design diagrams",segment: "system-design",icon: "board" },
    ] as const).map(item => <Link className="ws-card ws-shortcut" key={item.segment} href={`/dashboard/repositories/${featuredRepo.id}/${item.segment}`}><span className="ws-icon-box blue"><WorkspaceIcon name={item.icon} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><WorkspaceIcon name="arrow" size={16} /></Link>)}</div></section>}
    {readme?.readme&&<details className="ws-card ws-readme"><summary>About this organization</summary><div><ReadmeMarkdown content={readme.readme} /></div></details>}
  </div>;
}
