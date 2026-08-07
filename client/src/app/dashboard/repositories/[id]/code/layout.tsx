"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { CodeBranchContext } from "./code-context";
import { PanelIcon } from "./icons";
import FileTree from "./FileTree";

export default function CodeLayout({ children }: { children: ReactNode }) {
  // `path` comes through here too, via useParams — Next.js merges params
  // from the whole matched route, not just the leaf page.
  const { id, path } = useParams<{ id: string; path?: string[] }>();
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const atRoot = !path || path.length === 0;

  // Lives here rather than in the per-path page below, so it survives
  // navigating between files instead of resetting on every click — this
  // layout isn't remounted by that navigation, only its `children` are.
  useEffect(() => {
    setBranch("");
    apiFetch(`/api/code/${id}/branches`)
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setBranches(body.data);
      })
      .catch(() => {});

    apiFetch(`/api/repositories/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setBranch(body.data.default_branch);
      })
      .catch(() => {});
  }, [id]);

  return (
    <CodeBranchContext.Provider value={{ branch, setBranch, branches }}>
      <div className="flex gap-4">
        {/* The tree is for navigating into the repo, so it has no reason to
            show at the root overview — only once you've actually clicked
            into a file or folder. */}
        {!atRoot && sidebarOpen && (
          <div className="w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Files</span>
              <button
                onClick={() => setSidebarOpen(false)}
                title="Collapse file tree"
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
              >
                <PanelIcon />
              </button>
            </div>
            {branch && <FileTree repoId={id} branch={branch} />}
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          {!atRoot && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Expand file tree"
              className="p-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 w-fit"
            >
              <PanelIcon />
            </button>
          )}
          {children}
        </div>
      </div>
    </CodeBranchContext.Provider>
  );
}
