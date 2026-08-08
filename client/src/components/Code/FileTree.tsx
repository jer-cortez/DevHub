"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CodeAPI, type DirEntry } from "@/API/CodeAPI";
import { FolderIcon, FileIcon, ChevronRightIcon } from "@/components/Common/icons";

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({
  repoId,
  branch,
  entry,
  depth,
}: {
  repoId: string;
  branch: string;
  entry: DirEntry;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const pathname = usePathname();

  if (entry.type === "file") {
    const isActive = pathname === `/dashboard/repositories/${repoId}/code/${entry.path}`;
    return (
      <Link
        href={`/dashboard/repositories/${repoId}/code/${entry.path}`}
        className={`flex items-center gap-1.5 py-1 text-sm rounded truncate ${
          isActive
            ? "bg-blue-50 dark:bg-neutral-800 font-medium"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
        style={{ paddingLeft: `${depth * 14 + 20}px` }}
      >
        <FileIcon />
        <span className="truncate">{entry.name}</span>
      </Link>
    );
  }

  const toggle = async () => {
    if (!expanded && children === null) {
      try {
        const data = await CodeAPI.getContents(repoId, entry.path, branch);
        if (Array.isArray(data)) {
          setChildren(sortEntries(data));
        }
      } catch {
        // Leave children null — toggle will just show nothing under this
        // folder; user can retry by collapsing/expanding again.
      }
    }
    setExpanded((e) => !e);
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 w-full text-left py-1 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <ChevronRightIcon className={expanded ? "rotate-90" : ""} />
        <FolderIcon />
        <span className="truncate">{entry.name}</span>
      </button>
      {expanded && children && (
        <div>
          {children.map((child) => (
            <TreeNode key={child.path} repoId={repoId} branch={branch} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ repoId, branch }: { repoId: string; branch: string }) {
  const [entries, setEntries] = useState<DirEntry[] | null>(null);

  useEffect(() => {
    setEntries(null);
    CodeAPI.getContents(repoId, "", branch)
      .then((data) => {
        if (Array.isArray(data)) setEntries(sortEntries(data));
      })
      .catch(() => {});
  }, [repoId, branch]);

  if (entries === null) {
    return <p className="text-xs text-neutral-500 py-2">Loading files...</p>;
  }

  return (
    <div className="space-y-0.5 max-h-[70vh] overflow-y-auto">
      {entries.map((entry) => (
        <TreeNode key={entry.path} repoId={repoId} branch={branch} entry={entry} depth={0} />
      ))}
    </div>
  );
}
