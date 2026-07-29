"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFollowersController = void 0;
const repoFollowers_services_1 = require("../services/repoFollowers.services");
exports.RepoFollowersController = {
    async findAll(_req, res) {
        try {
            const followers = await repoFollowers_services_1.RepoFollowersServices.findAll();
            res.status(200).json({ data: followers });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch repo followers' });
        }
    },
    async findById(req, res) {
        try {
            const id = BigInt(req.params.id);
            const follower = await repoFollowers_services_1.RepoFollowersServices.findById(id);
            res.status(200).json({ data: follower });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch repo follower' });
        }
    },
    async create(req, res) {
        try {
            const follower = await repoFollowers_services_1.RepoFollowersServices.create(req.body);
            res.status(201).json({ data: follower });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create repo follower' });
        }
    },
    async delete(req, res) {
        try {
            const id = BigInt(req.params.id);
            await repoFollowers_services_1.RepoFollowersServices.delete(id);
            res.status(200).json({ message: 'Repo follower deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete repo follower' });
        }
    },
};
