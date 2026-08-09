import { apiRequest } from "./apiClient";

export type NotificationType = "pull_request" | "issue" | "comment";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  repo_id: string | null;
  pr_id: string | null;
  issue_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  /** Pre-rendered summary, written at fan-out time — see the denormalization note in the migration SQL. */
  title: string | null;
  url: string | null;
  is_read: boolean;
  /** True when the event concerns this user specifically (their PR, a review requested from them, an issue assigned to them) rather than just their repo. */
  is_direct: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const NotificationsAPI = {
  findMine: () => apiRequest<NotificationsResponse>("/api/notifications/mine"),
  markRead: (id: string) =>
    apiRequest<{ id: string }>(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => apiRequest<{ count: number }>("/api/notifications/read-all", { method: "POST" }),
};

export const notificationsKey = "notifications" as const;
