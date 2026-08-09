import { apiRequest } from "./apiClient";

export interface Organization {
  id: string;
  name: string;
  avatar_url: string;
}

export const OrganizationsAPI = {
  findAll: () => apiRequest<Organization[]>("/api/organizations/all"),
};

export const organizationsKey = "organizations" as const;
