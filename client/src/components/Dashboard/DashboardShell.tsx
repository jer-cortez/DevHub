"use client";

import { useState,type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import SignOutButton from "@/components/Common/SignOutButton";
import NotificationBell from "@/components/Notifications/NotificationBell";
import NotificationToasts from "@/components/Notifications/NotificationToasts";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { OrganizationsAPI,organizationsKey } from "@/API/OrganizationsAPI";
import { RepositoriesAPI,repositoriesKey,repositoryKey } from "@/API/RepositoriesAPI";
import { OrganizationMembersAPI,orgMembersKey } from "@/API/OrganizationMembersAPI";
import WorkspaceIcon,{ type WorkspaceIconName } from "./WorkspaceIcon";
import ThemeSelect from "./ThemeSelect";
import "./workspace.css";

const navigation: { label: string; href: string; icon: WorkspaceIconName }[]=[
  { label: "Overview",href: "/dashboard",icon: "overview" },
  { label: "Repositories",href: "/dashboard/repositories",icon: "repo" },
  { label: "Organization health",href: "/dashboard/health",icon: "health" },
  { label: "Teams",href: "/dashboard/teams",icon: "people" },
  { label: "People",href: "/dashboard/people",icon: "people" },
];
const repoTabs: { label: string; segment: string; icon: WorkspaceIconName }[]=[
  { label: "Code",segment: "code",icon: "code" },
  { label: "Issues",segment: "issues",icon: "issue" },
  { label: "Pull requests",segment: "pull-requests",icon: "branch" },
  { label: "System design",segment: "system-design",icon: "board" },
];

export default function DashboardShell({ username,avatarUrl,children }: { username: string; avatarUrl?: string; children: ReactNode }) {
  const pathname=usePathname();
  const [menuOpen,setMenuOpen]=useState(false);
  const repoId=pathname?.match(/^\/dashboard\/repositories\/([^/]+)(\/|$)/)?.[1];
  const segment=pathname?.match(/^\/dashboard\/repositories\/[^/]+\/([^/]+)/)?.[1];
  const { data: orgs }=useSWR(organizationsKey,OrganizationsAPI.findAll);
  const { data: repositories }=useSWR(repositoriesKey,RepositoriesAPI.findAll);
  const { data: members }=useSWR(orgMembersKey,OrganizationMembersAPI.findAllWithUserInfo);
  const { data: repo }=useSWR(repoId? repositoryKey(repoId):null,() => RepositoriesAPI.findById(repoId!));
  const org=orgs?.[0];
  const currentPage=repoId? repoTabs.find(t => t.segment===segment)?.label??"Repository":navigation.find(t => t.href===pathname)?.label??"Overview";
  const displayName=username||"Your workspace";
  const initials=displayName.slice(0,2).toUpperCase();
  const avatar=<span className="ws-avatar">{avatarUrl? <img src={avatarUrl} alt="" />:initials}</span>;

  return <NotificationsProvider>
    <div className="workspace">
      <a href="#workspace-main" className="ws-skip">Skip to content</a>
      <aside className={`ws-sidebar ${menuOpen? "is-open":""}`} id="workspace-navigation" onKeyDown={event => { if(event.key==="Escape") setMenuOpen(false); }}>
        <Link href="/dashboard" className="ws-brand" onClick={() => setMenuOpen(false)}><span className="ws-logo"><WorkspaceIcon name="branch" size={26} /></span><span><strong>DevHub</strong><small>Code review workspace</small></span></Link>
        <div className="ws-org"><span className="ws-org-avatar">{org?.name?.slice(0,1).toUpperCase()??"O"}</span><div><strong>{org?.name??"Organization"}</strong><small>Organization workspace</small></div></div>
        <nav aria-label="Organization" className="ws-nav">
          <p className="ws-nav-label">Organization</p>
          {navigation.map(item => {
            const active=item.href==="/dashboard"? pathname===item.href:pathname?.startsWith(item.href);
            const count=item.icon==="repo"? repositories?.length:item.label==="People"? members?.length:undefined;
            return <Link key={item.href} href={item.href} aria-current={active? "page":undefined} onClick={() => setMenuOpen(false)}><WorkspaceIcon name={item.icon} /><span>{item.label}</span>{count!==undefined&&<small>{count}</small>}</Link>;
          })}
          <p className="ws-nav-label ws-repo-label">Repository workspaces</p>
          {repositories?.slice(0,6).map(item => <Link key={item.id} href={`/dashboard/repositories/${item.id}/code`} onClick={() => setMenuOpen(false)} className={repoId===item.id? "ws-selected-repo":""}><span className="ws-dot" /><span className="truncate">{item.name}</span></Link>)}
          {repositories?.length===0&&<p className="ws-sidebar-empty">Synced repositories will appear here.</p>}
          {(repositories?.length??0)>6&&<Link href="/dashboard/repositories" onClick={() => setMenuOpen(false)}>View all repositories <WorkspaceIcon name="arrow" size={14} /></Link>}
        </nav>
        <div className="ws-account">{avatar}<div><strong>{displayName}</strong><SignOutButton /></div></div>
      </aside>
      {menuOpen&&<button className="ws-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <div className="ws-body">
        <header className="ws-topbar">
          <button className="ws-menu ws-button" aria-label={menuOpen? "Close navigation":"Open navigation"} aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(!menuOpen)}><WorkspaceIcon name={menuOpen? "close":"menu"} /></button>
          <div className="ws-context"><div><Link href="/dashboard">{org?.name??"Organization"}</Link><span>/</span><strong>{repoId? repo?.name??"Repository":currentPage}</strong></div><small>{repoId? currentPage:`Organization-wide view${repositories? ` across ${repositories.length} repositories`:""}`}</small></div>
          <div className="ws-top-actions"><ThemeSelect /><NotificationBell />{avatar}</div>
        </header>
        <main id="workspace-main" className="ws-main" tabIndex={-1}>
          {repoId&&<nav className="ws-repo-tabs" aria-label="Repository">{repoTabs.map(tab => <Link key={tab.segment} href={`/dashboard/repositories/${repoId}/${tab.segment}`} aria-current={segment===tab.segment? "page":undefined}><WorkspaceIcon name={tab.icon} size={17} />{tab.label}</Link>)}</nav>}
          {children}
        </main>
      </div>
      <NotificationToasts />
    </div>
  </NotificationsProvider>;
}
