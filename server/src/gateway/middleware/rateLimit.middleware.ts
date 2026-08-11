import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/** All routes here sit behind AuthMiddleware, so req.user is always set by the time these run. */
function keyByUser(req: Request): string {
  if (req.user?.id) return req.user.id;
  return ipKeyGenerator(req.ip ?? 'unknown');
}

/**
 * Guards routes that call the GitHub API on our shared GITHUB_APP_TOKEN
 * (repo/PR/issue sync). GitHub's own rate limit is shared across every user
 * of the app, so one member hammering a sync endpoint can exhaust it for
 * everyone — this keeps a single user from doing that.
 */
export const githubRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: 'Too many GitHub sync requests, please try again shortly' },
});

/**
 * Guards routes that call the Anthropic API (PR summarization) — each call
 * has a real per-token cost, so this caps how much of that cost a single
 * user can trigger per minute.
 */
export const anthropicRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: 'Too many summarization requests, please try again shortly' },
});
