import { apiRequest } from "./apiClient";

export interface Repository {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  default_branch: string;
}

export const RepositoriesAPI = {
  findAll: () => apiRequest<Repository[]>("/api/repositories/all"),
  findById: (id: string) => apiRequest<Repository>(`/api/repositories/${id}`),
  syncFromGithub: () => apiRequest<Repository[]>("/api/repositories/sync", { method: "POST" }),
};
