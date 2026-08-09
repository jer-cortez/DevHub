"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { CodeAPI, codeContentsKey, type DirEntry } from "@/API/CodeAPI";
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
  const pathname = usePathname();

  // Passing `null` as the key when collapsed skips the fetch entirely —
  // this is what makes expansion "lazy": the request only fires the first
  // time a folder is opened, and SWR caches it under this same key for
  // every future expand/collapse of the same folder.
  const { data: children } = useSWR(
    entry.type === "dir" && expanded ? codeContentsKey(repoId, branch, entry.path) : null,
    () => CodeAPI.getContents(repoId, entry.path, branch)
  );

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

  const sortedChildren = children && Array.isArray(children) ? sortEntries(children) : null;

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 w-full text-left py-1 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <ChevronRightIcon className={expanded ? "rotate-90" : ""} />
        <FolderIcon />
        <span className="truncate">{entry.name}</span>
      </button>
      {expanded && sortedChildren && (
        <div>
          {sortedChildren.map((child) => (
            <TreeNode key={child.path} repoId={repoId} branch={branch} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ repoId, branch }: { repoId: string; branch: string }) {
  const { data: rootEntries } = useSWR(codeContentsKey(repoId, branch, ""), () =>
    CodeAPI.getContents(repoId, "", branch)
  );
  const entries = rootEntries && Array.isArray(rootEntries) ? sortEntries(rootEntries) : null;

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
