import { createContext, useContext } from "react";
import type { TableStyle } from "@/components/SystemDesign/AddTableDialog";

/**
 * TableNode is a separate component instance per node and doesn't have
 * direct access to BoardCanvas's `nodes`/`edges` state or `sendUpdate` — a
 * function can't be safely stored in a node's `data` (it gets JSON-
 * serialized for the socket and the DB), so this context is how a node
 * reports edits (rename, restyle, resize) back up to BoardCanvas, which
 * owns the actual state and broadcasting.
 */
export interface BoardActions {
  renameNode: (id: string, label: string) => void;
  restyleNode: (id: string, style: TableStyle) => void;
  resizeNode: (id: string, width: number, height: number) => void;
}

export const BoardActionsContext = createContext<BoardActions | null>(null);

export function useBoardActions(): BoardActions {
  const ctx = useContext(BoardActionsContext);
  if (!ctx) throw new Error("useBoardActions must be used within BoardActionsContext.Provider");
  return ctx;
}
