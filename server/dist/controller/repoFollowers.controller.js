"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFollowersController = void 0;
const repoFollowers_services_1 = require("../services/repoFollowers.services");
const currentUser_services_1 = require("../services/currentUser.services");
/** Picks only the known preference booleans out of a request body, so a client can't set arbitrary columns via the spread. */
function extractPreferences(body) {
    const source = (body ?? {});
    const preferences = {};
    const keys = [
        'notify_pull_requests',
        'notify_issues',
        'notify_comments',
    ];
    for (const key of keys) {
        if (typeof source[key] === 'boolean')
            preferences[key] = source[key];
    }
    return preferences;
}
exports.RepoFollowersController = {
    async findMine(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const follows = await repoFollowers_services_1.RepoFollowersServices.findForUser(user.id);
            res.status(200).json({ data: follows });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch followed repositories' });
        }
    },
    async follow(req, res) {
        try {
            const repoId = req.body?.repoId;
            if (!repoId) {
                res.status(400).json({ error: 'repoId is required' });
                return;
            }
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const follow = await repoFollowers_services_1.RepoFollowersServices.follow(user.id, repoId, extractPreferences(req.body));
            res.status(200).json({ data: follow });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to follow repository' });
        }
    },
    async updatePreferences(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const follow = await repoFollowers_services_1.RepoFollowersServices.updatePreferences(user.id, req.params.repoId, extractPreferences(req.body));
            res.status(200).json({ data: follow });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update follow preferences' });
        }
    },
    async unfollow(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            await repoFollowers_services_1.RepoFollowersServices.unfollow(user.id, req.params.repoId);
            res.status(200).json({ data: null });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to unfollow repository' });
        }
    },
};
