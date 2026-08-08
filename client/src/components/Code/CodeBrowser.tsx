"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeAPI, type DirEntry, type LastCommit } from "@/API/CodeAPI";
import { FolderIcon, FileIcon, BranchIcon, ChevronDownIcon } from "@/components/Common/icons";
import { useCodeBranch } from "@/contexts/CodeBranchContext";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "dir"; entries: DirEntry[] }
  | { status: "file"; file: { type: "file"; name: string; path: string; size: number; content: string } };

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

function timeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = seconds;
  for (const [limit, unit] of units) {
    if (value < limit) {
      const rounded = Math.floor(value);
      return `${rounded} ${unit}${rounded !== 1 ? "s" : ""} ago`;
    }
    value = Math.floor(value / limit);
  }
  return "";
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
  const [state, setState] = useState<State>({ status: "loading" });
  const [lastCommit, setLastCommit] = useState<LastCommit | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
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

  // Repo-level latest commit only (not per-file — see code.services.ts's
  // getLastCommit comment for why), re-fetched when the branch changes.
  useEffect(() => {
    if (!branch) return;
    CodeAPI.getLastCommit(repoId, branch)
      .then(setLastCommit)
      .catch(() => {});
  }, [repoId, branch]);

  useEffect(() => {
    if (!branch) return;
    setState({ status: "loading" });
    setFilterQuery("");
    CodeAPI.getContents(repoId, path, branch)
      .then((data) => {
        if (Array.isArray(data)) {
          const entries = [...data].sort((a, b) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          setState({ status: "dir", entries });
        } else {
          setState({ status: "file", file: data });
        }
      })
      .catch((err) => setState({ status: "error", message: err.message }));
  }, [repoId, path, branch]);

  // README rendering is scoped to the repo root only (not per-directory —
  // keeps this simple, matches the common case).
  useEffect(() => {
    if (!branch || path) {
      setReadme(null);
      return;
    }
    CodeAPI.getContents(repoId, "README.md", branch)
      .then((data) => setReadme("content" in data ? data.content : null))
      .catch(() => setReadme(null));
  }, [repoId, path, branch]);

  const segments = path ? path.split("/") : [];
  const visibleEntries =
    state.status === "dir"
      ? state.entries.filter((entry) => entry.name.toLowerCase().includes(filterQuery.toLowerCase()))
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

      {state.status === "dir" && (
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

      {state.status === "loading" && (
        <p className="text-sm text-neutral-500">Loading...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "dir" && (
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
                {state.entries.length === 0 ? "This folder is empty." : "No files match your search."}
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: (props) => <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                    h2: (props) => <h2 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                    h3: (props) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
                    p: (props) => <p className="mb-3 text-neutral-700 dark:text-neutral-300" {...props} />,
                    ul: (props) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                    ol: (props) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                    a: (props) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                    code: (props) => (
                      <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-xs" {...props} />
                    ),
                    pre: (props) => (
                      <pre className="rounded bg-neutral-100 dark:bg-neutral-800 p-3 overflow-x-auto mb-3" {...props} />
                    ),
                  }}
                >
                  {readme}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}

      {state.status === "file" && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {state.file.content.split("\n").length} lines · {formatBytes(state.file.size)}
            </span>
            <CopyButton content={state.file.content} />
          </div>
          <SyntaxHighlighter
            language={guessLanguage(state.file.name)}
            style={isDark ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              fontSize: "0.8rem",
              background: isDark ? "#0d1117" : "#ffffff",
            }}
            lineNumberStyle={{ opacity: 0.4, minWidth: "2.5em" }}
            showLineNumbers
          >
            {state.file.content}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
