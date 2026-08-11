"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUMMARY_MODEL = exports.anthropic = void 0;
// Same reason as lib/github.ts: the key is read at module load, so this must
// not depend on some other module having loaded dotenv first.
require("dotenv/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
exports.anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
/**
 * Sonnet 5 rather than Opus: summarizing a diff is bounded extraction and
 * explanation, not deep reasoning, and this runs once per PR revision across
 * every repo. Overridable by env so switching models is a config change
 * rather than a deploy — summary_model on each row records which one wrote it.
 */
exports.SUMMARY_MODEL = process.env.ANTHROPIC_SUMMARY_MODEL ?? 'claude-sonnet-5';
