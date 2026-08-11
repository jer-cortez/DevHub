import { z } from 'zod';

const preferencesShape = {
  notify_pull_requests: z.boolean().optional(),
  notify_issues: z.boolean().optional(),
  notify_comments: z.boolean().optional(),
};

export const followRepoBody = z.object({
  repoId: z.uuid(),
  ...preferencesShape,
});

export const updateFollowPreferencesBody = z.object(preferencesShape);
