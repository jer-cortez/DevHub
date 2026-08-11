"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicRateLimiter = exports.githubRateLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
/** All routes here sit behind AuthMiddleware, so req.user is always set by the time these run. */
function keyByUser(req) {
    if (req.user?.id)
        return req.user.id;
    return (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? 'unknown');
}
/**
 * Guards routes that call the GitHub API on our shared GITHUB_APP_TOKEN
 * (repo/PR/issue sync). GitHub's own rate limit is shared across every user
 * of the app, so one member hammering a sync endpoint can exhaust it for
 * everyone — this keeps a single user from doing that.
 */
exports.githubRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
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
exports.anthropicRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyByUser,
    message: { error: 'Too many summarization requests, please try again shortly' },
});
