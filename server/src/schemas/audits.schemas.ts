import { z } from 'zod';

export const auditFeedbackBody = z.object({
  finding_id: z.string().min(1).max(200),
  verdict: z.enum(['useful', 'incorrect']),
});
