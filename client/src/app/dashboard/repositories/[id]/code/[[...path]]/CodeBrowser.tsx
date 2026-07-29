"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { apiFetch } from "@/lib/api";

interface DirEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
}

interface FileEntry {
  type: "file";
  name: string;
  path: string;
  size: number;
  content: string;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "dir"; entries: DirEntry[] }
  | { status: "file"; file: FileEntry };

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

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="shrink-0 fill-[#54aeff]">
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className="shrink-0 fill-none stroke-neutral-400 dark:stroke-neutral-500"
      strokeWidth="1.2"
    >
      <path d="M3 1.5h6.5L13 5v9a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 3 14V2a.5.5 0 0 1 0-.5Z" />
      <path d="M9.5 1.5V5H13" />
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
  const [state, setState] = useState<State>({ status: "loading" });
  const isDark = usePrefersDark();

  useEffect(() => {
    setState({ status: "loading" });
    apiFetch(`/api/code/${repoId}/contents?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? `Request failed (${res.status})` });
          return;
        }
        if (Array.isArray(body.data)) {
          const entries = [...body.data].sort((a: DirEntry, b: DirEntry) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          setState({ status: "dir", entries });
        } else {
          setState({ status: "file", file: body.data });
        }
      })
      .catch((err) => setState({ status: "error", message: err.message }));
  }, [repoId, path]);

  const segments = path ? path.split("/") : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 text-base font-mono">
        <Link
          href={`/dashboard/repositories/${repoId}/code`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          root
        </Link>
        {segments.map((segment, i) => {
          const ancestorPath = segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          return (
            <span key={ancestorPath} className="flex items-center gap-1">
              <span className="text-neutral-400 dark:text-neutral-600">/</span>
              <Link
                href={`/dashboard/repositories/${repoId}/code/${ancestorPath}`}
                className={
                  isLast
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-blue-600 dark:text-blue-400 hover:underline"
                }
              >
                {segment}
              </Link>
            </span>
          );
        })}
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-neutral-500">Loading...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "dir" && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {state.entries.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">This folder is empty.</p>
          )}
          {state.entries.map((entry, i) => (
            <Link
              key={entry.path}
              href={`/dashboard/repositories/${repoId}/code/${entry.path}`}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-neutral-800/60 ${
                i !== state.entries.length - 1
                  ? "border-b border-neutral-200 dark:border-neutral-800"
                  : ""
              }`}
            >
              {entry.type === "dir" ? <FolderIcon /> : <FileIcon />}
              <span className="text-neutral-700 dark:text-neutral-300">{entry.name}</span>
            </Link>
          ))}
        </div>
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
