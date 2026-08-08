import { apiRequest } from "./apiClient";

export interface DirEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
}

export interface FileEntry {
  type: "file";
  name: string;
  path: string;
  size: number;
  content: string;
}

export interface LastCommit {
  shortSha: string;
  message: string;
  authorLogin: string;
  authorAvatarUrl: string | null;
  date: string | null;
  totalCount: number;
}

export const CodeAPI = {
  getBranches: (repoId: string) => apiRequest<string[]>(`/api/code/${repoId}/branches`),
  getContents: (repoId: string, path: string, ref: string) =>
    apiRequest<DirEntry[] | FileEntry>(
      `/api/code/${repoId}/contents?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`
    ),
  getLastCommit: (repoId: string, ref: string) =>
    apiRequest<LastCommit>(`/api/code/${repoId}/last-commit?ref=${encodeURIComponent(ref)}`),
};
