"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DrawingBoardsAPI, type Board } from "@/API/DrawingBoardsAPI";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; boards: Board[] };

export default function BoardsList({ repoId }: { repoId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const boards = await DrawingBoardsAPI.findByRepoId(repoId);
      setState({ status: "ready", boards });
    } catch (err: any) {
      setState({ status: "error", message: err.message });
    }
  }, [repoId]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleCreate = async () => {
    const title = window.prompt("Board title", "New Board");
    if (!title) return;

    setCreating(true);
    setCreateError(null);
    try {
      await DrawingBoardsAPI.create({
        repo_id: repoId,
        type: "system-design",
        title,
        nodes: [],
        edges: [],
      });
      await loadBoards();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="text-sm rounded-md px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
        >
          {creating ? "Creating..." : "New board"}
        </button>
        {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-neutral-500">Loading boards...</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.boards.length === 0 && (
        <p className="text-sm text-neutral-500">No boards yet. Create one to start diagramming.</p>
      )}

      {state.status === "ready" && state.boards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.boards.map((board) => (
            <Link
              key={board.id}
              href={`/dashboard/repositories/${repoId}/system-design/${board.id}`}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              <h3 className="font-medium">{board.title}</h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
                Updated {new Date(board.updated_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
