import { apiRequest } from "./apiClient";

export interface OrgMember {
  id: string;
  joined_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export const OrganizationMembersAPI = {
  findAllWithUserInfo: () => apiRequest<OrgMember[]>("/api/org-members/members"),
  syncFromGithub: () => apiRequest<OrgMember[]>("/api/org-members/sync", { method: "POST" }),
};

export const orgMembersKey = "org-members" as const;
