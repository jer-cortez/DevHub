import { apiRequest } from "./apiClient";

export interface Organization {
  id: string;
  name: string;
  avatar_url: string;
}

export const OrganizationsAPI = {
  findAll: () => apiRequest<Organization[]>("/api/organizations/all"),
  getReadme: () => apiRequest<{ readme: string | null }>("/api/organizations/readme"),
};

export const organizationsKey = "organizations" as const;
export const organizationReadmeKey = "organization-readme" as const;
