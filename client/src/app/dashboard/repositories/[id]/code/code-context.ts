import { createContext, useContext } from "react";

/**
 * Branch selection is shared between the sidebar file tree and the main
 * CodeBrowser view via context, provided by code/layout.tsx — which sits
 * above the per-path page and so isn't remounted when navigating between
 * files. Keeping the state there (rather than inside CodeBrowser, which
 * does remount per path) means the sidebar tree and the main view always
 * agree on which branch they're showing, and the sidebar's expanded/
 * collapsed folders survive navigating to a different file.
 */
export interface CodeBranchState {
  branch: string;
  setBranch: (branch: string) => void;
  branches: string[];
}

export const CodeBranchContext = createContext<CodeBranchState | null>(null);

export function useCodeBranch(): CodeBranchState {
  const ctx = useContext(CodeBranchContext);
  if (!ctx) throw new Error("useCodeBranch must be used within CodeBranchContext.Provider");
  return ctx;
}
