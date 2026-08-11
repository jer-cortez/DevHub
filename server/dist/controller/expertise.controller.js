"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpertiseController = void 0;
const expertise_services_1 = require("../services/expertise.services");
const currentUser_services_1 = require("../services/currentUser.services");
exports.ExpertiseController = {
    async suggestReviewers(req, res) {
        try {
            const prId = req.params.prId;
            res.status(200).json({ data: await expertise_services_1.ExpertiseServices.suggestReviewers(prId) });
        }
        catch (error) {
            console.error('Failed to suggest reviewers:', error);
            res.status(500).json({ error: 'Failed to suggest reviewers' });
        }
    },
    /** The current user's own "Allow automated PR review suggestions" setting. */
    async getMyOptIn(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            res.status(200).json({ data: { allow_review_suggestions: user.allow_review_suggestions } });
        }
        catch (error) {
            console.error('Failed to read suggestion preference:', error);
            res.status(500).json({ error: 'Failed to read preference' });
        }
    },
    async setMyOptIn(req, res) {
        try {
            const { allow } = req.body ?? {};
            if (typeof allow !== 'boolean') {
                return res.status(400).json({ error: 'allow must be a boolean' });
            }
            // resolveLocalUser, not req.user.id — the latter is the Supabase Auth
            // UUID and would not match users.id.
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            res.status(200).json({ data: await expertise_services_1.ExpertiseServices.setSuggestionOptIn(user.id, allow) });
        }
        catch (error) {
            console.error('Failed to update suggestion preference:', error);
            res.status(500).json({ error: 'Failed to update preference' });
        }
    },
    async getStats(_req, res) {
        try {
            res.status(200).json({ data: await expertise_services_1.ExpertiseServices.getIndexStats() });
        }
        catch (error) {
            console.error('Failed to read expertise index stats:', error);
            res.status(500).json({ error: 'Failed to read index stats' });
        }
    },
};
