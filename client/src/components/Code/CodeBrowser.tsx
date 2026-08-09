"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CodeAPI, codeContentsKey, lastCommitKey } from "@/API/CodeAPI";
import { FolderIcon, FileIcon, BranchIcon, ChevronDownIcon } from "@/components/Common/icons";
import ReadmeMarkdown from "@/components/Common/ReadmeMarkdown";
import { useCodeBranch } from "@/contexts/CodeBranchContext";
import { timeAgo } from "@/lib/timeAgo";

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  css: "css",
  html: "markup",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  sql: "sql",
};

function guessLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_LANGUAGE_MAP[ext] ?? "text";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Bytes`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function usePrefersDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return isDark;
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current">
      <path d="M8 1.5a6.5 6.5 0 1 0 5.29 10.29.75.75 0 0 1 1.18.92A8 8 0 1 1 16 8a.75.75 0 0 1-1.5 0A6.5 6.5 0 0 0 8 1.5Z" />
      <path d="M8 4a.75.75 0 0 1 .75.75v3l2.4 1.4a.75.75 0 0 1-.75 1.3l-2.775-1.62A.75.75 0 0 1 7.25 8V4.75A.75.75 0 0 1 8 4Z" />
    </svg>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function CodeBrowser({ repoId, path }: { repoId: string; path: string }) {
  const { branch, setBranch, branches } = useCodeBranch();
  const [filterQuery, setFilterQuery] = useState("");
  const filterInputRef = useRef<HTMLInputElement>(null);
  const isDark = usePrefersDark();

  // "T" focuses the file filter, matching GitHub's own "go to file" shortcut
  // — but only when not already typing somewhere else on the page.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key.toLowerCase() === "t" && !isTyping) {
        e.preventDefault();
        filterInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setFilterQuery("");
  }, [path]);

  // Repo-level latest commit only (not per-file — see code.services.ts's
  // getLastCommit comment for why), re-fetched when the branch changes.
  const { data: lastCommit = null } = useSWR(
    branch ? lastCommitKey(repoId, branch) : null,
    () => CodeAPI.getLastCommit(repoId, branch)
  );

  const {
    data: contents,
    error: contentsError,
    isLoading: contentsLoading,
  } = useSWR(branch ? codeContentsKey(repoId, branch, path) : null, () => CodeAPI.getContents(repoId, path, branch));

  // README rendering is scoped to the repo root only (not per-directory —
  // keeps this simple, matches the common case).
  const { data: readmeFile } = useSWR(
    branch && !path ? codeContentsKey(repoId, branch, "README.md") : null,
    () => CodeAPI.getContents(repoId, "README.md", branch)
  );
  const readme = readmeFile && "content" in readmeFile ? readmeFile.content : null;

  const entries =
    contents && Array.isArray(contents)
      ? [...contents].sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
      : null;
  const file = contents && !Array.isArray(contents) ? contents : null;

  const segments = path ? path.split("/") : [];
  const visibleEntries = entries
    ? entries.filter((entry) => entry.name.toLowerCase().includes(filterQuery.toLowerCase()))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {branches.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="appearance-none text-sm font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 pl-7 pr-6 py-1.5 cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
              <BranchIcon />
            </span>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <ChevronDownIcon />
            </span>
          </div>
        )}

        {path && (
          <div className="flex items-center gap-1 text-base font-mono min-w-0">
            <Link
              href={`/dashboard/repositories/${repoId}/code`}
              className="text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              root
            </Link>
            {segments.map((segment, i) => {
              const ancestorPath = segments.slice(0, i + 1).join("/");
              const isLast = i === segments.length - 1;
              return (
                <span key={ancestorPath} className="flex items-center gap-1 min-w-0">
                  <span className="text-neutral-400 dark:text-neutral-600 shrink-0">/</span>
                  <Link
                    href={`/dashboard/repositories/${repoId}/code/${ancestorPath}`}
                    className={
                      isLast
                        ? "text-neutral-900 dark:text-neutral-100 truncate"
                        : "text-blue-600 dark:text-blue-400 hover:underline truncate"
                    }
                  >
                    {segment}
                  </Link>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {entries && (
        <div className="relative max-w-md">
          <input
            ref={filterInputRef}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Go to file"
            className="w-full text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent pl-3 pr-8 py-1.5"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded border border-neutral-300 dark:border-neutral-700 px-1.5 text-neutral-400 dark:text-neutral-600">
            T
          </kbd>
        </div>
      )}

      {contentsLoading && (
        <p className="text-sm text-neutral-500">Loading...</p>
      )}

      {contentsError && (
        <p className="text-sm text-red-600 dark:text-red-400">{contentsError.message}</p>
      )}

      {entries && (
        <>
          <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {lastCommit && (
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-sm">
                {lastCommit.authorAvatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lastCommit.authorAvatarUrl} alt={lastCommit.authorLogin} className="h-5 w-5 rounded-full" />
                )}
                <span className="font-medium">{lastCommit.authorLogin}</span>
                <span className="text-neutral-500 dark:text-neutral-400 truncate">{lastCommit.message}</span>
                <span className="ml-auto flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-600 shrink-0">
                  <span>{lastCommit.shortSha}</span>
                  <span>{timeAgo(lastCommit.date)}</span>
                  <span className="flex items-center gap-1">
                    <HistoryIcon />
                    {lastCommit.totalCount} Commits
                  </span>
                </span>
              </div>
            )}

            {visibleEntries.length === 0 && (
              <p className="p-4 text-sm text-neutral-500">
                {entries.length === 0 ? "This folder is empty." : "No files match your search."}
              </p>
            )}
            {visibleEntries.map((entry, i) => (
              <Link
                key={entry.path}
                href={`/dashboard/repositories/${repoId}/code/${entry.path}`}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-neutral-800/60 ${
                  i !== visibleEntries.length - 1
                    ? "border-b border-neutral-200 dark:border-neutral-800"
                    : ""
                }`}
              >
                {entry.type === "dir" ? <FolderIcon /> : <FileIcon />}
                <span className="text-neutral-700 dark:text-neutral-300">{entry.name}</span>
              </Link>
            ))}
          </div>

          {readme && (
            <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-2 text-sm font-medium bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                README.md
              </div>
              <div className="p-4 text-sm leading-relaxed">
                <ReadmeMarkdown content={readme} />
              </div>
            </div>
          )}
        </>
      )}

      {file && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {file.content.split("\n").length} lines · {formatBytes(file.size)}
            </span>
            <CopyButton content={file.content} />
          </div>
          <SyntaxHighlighter
            language={guessLanguage(file.name)}
            style={isDark ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              fontSize: "0.8rem",
              background: isDark ? "#0d1117" : "#ffffff",
            }}
            lineNumberStyle={{ opacity: 0.4, minWidth: "2.5em" }}
            showLineNumbers
          >
            {file.content}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
