import { apiRequest } from "./apiClient";

export interface Board {
  id: string;
  title: string;
  type: string;
  updated_at: string;
}

export interface CreateBoardPayload {
  repo_id: string;
  type: string;
  title: string;
  nodes: unknown[];
  edges: unknown[];
}

export const DrawingBoardsAPI = {
  findByRepoId: (repoId: string) => apiRequest<Board[]>(`/api/drawing-boards/by-repo/${repoId}`),
  create: (payload: CreateBoardPayload) =>
    apiRequest<Board>("/api/drawing-boards/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

export const drawingBoardsKey = (repoId: string) => ["drawing-boards", repoId] as const;
