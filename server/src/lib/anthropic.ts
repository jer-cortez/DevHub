// Same reason as lib/github.ts: the key is read at module load, so this must
// not depend on some other module having loaded dotenv first.
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Sonnet 5 rather than Opus: summarizing a diff is bounded extraction and
 * explanation, not deep reasoning, and this runs once per PR revision across
 * every repo. Overridable by env so switching models is a config change
 * rather than a deploy — summary_model on each row records which one wrote it.
 */
export const SUMMARY_MODEL = process.env.ANTHROPIC_SUMMARY_MODEL ?? 'claude-sonnet-5';
