import { createContext, useContext } from "react";

/**
 * Branch selection and sidebar visibility are shared between the sidebar file
 * tree and the main CodeBrowser view via context, provided by CodeLayout —
 * which sits above the per-path page and so isn't remounted when navigating
 * between files. Keeping the state there (rather than inside CodeBrowser,
 * which does remount per path) means the sidebar tree and the main view
 * always agree on which branch they're showing, the sidebar's expanded/
 * collapsed folders survive navigating to a different file, and the collapsed
 * state doesn't reset every time you click a file.
 *
 * The sidebar fields ride along here so CodeBrowser can render the "expand"
 * button inline with its branch selector / breadcrumb row, even though the
 * sidebar itself is owned by the layout above it.
 */
export interface CodeBranchState {
  branch: string;
  setBranch: (branch: string) => void;
  branches: string[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** False at the repo root, where the tree isn't shown at all. */
  canToggleSidebar: boolean;
}

export const CodeBranchContext = createContext<CodeBranchState | null>(null);

export function useCodeBranch(): CodeBranchState {
  const ctx = useContext(CodeBranchContext);
  if (!ctx) throw new Error("useCodeBranch must be used within CodeBranchContext.Provider");
  return ctx;
}
