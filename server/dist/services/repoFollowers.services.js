"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFollowersServices = void 0;
const repoFollowersSB_1 = require("../supabase/repoFollowersSB");
exports.RepoFollowersServices = {
    async findAll() {
        return repoFollowersSB_1.RepoFollowersSB.findAll();
    },
    async findById(id) {
        const follower = await repoFollowersSB_1.RepoFollowersSB.findById(id);
        if (!follower)
            throw new Error('Repo follower not found');
        return follower;
    },
    async create(payload) {
        return repoFollowersSB_1.RepoFollowersSB.create(payload);
    },
    async delete(id) {
        return repoFollowersSB_1.RepoFollowersSB.delete(id);
    },
};
