import { CommentIcon, IssueIcon, PullRequestIcon } from "@/components/Common/icons";
import type { NotificationType } from "@/API/NotificationsAPI";

/** Shared by the bell panel and the toast stack so one event type never renders as two different glyphs. */
export default function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === "pull_request") {
    return (
      <span className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
        <PullRequestIcon />
      </span>
    );
  }
  if (type === "issue") {
    return (
      <span className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
        <IssueIcon />
      </span>
    );
  }
  return (
    <span className="text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5">
      <CommentIcon />
    </span>
  );
}
