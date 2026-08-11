"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFollowersServices = void 0;
const repoFollowersSB_1 = require("../supabase/repoFollowersSB");
/**
 * Following is the lighter-weight counterpart to team membership: you don't
 * work on the repo, you just want a filtered view of what's happening there.
 * Unlike team membership, following is not exclusive — you can follow any
 * number of repos.
 */
exports.RepoFollowersServices = {
    async findForUser(userId) {
        return repoFollowersSB_1.RepoFollowersSB.findByUserId(userId);
    },
    async findOne(userId, repoId) {
        return repoFollowersSB_1.RepoFollowersSB.findOne(userId, repoId);
    },
    async follow(userId, repoId, preferences) {
        return repoFollowersSB_1.RepoFollowersSB.follow(userId, repoId, preferences);
    },
    async updatePreferences(userId, repoId, preferences) {
        return repoFollowersSB_1.RepoFollowersSB.updatePreferences(userId, repoId, preferences);
    },
    async unfollow(userId, repoId) {
        return repoFollowersSB_1.RepoFollowersSB.unfollow(userId, repoId);
    },
};
