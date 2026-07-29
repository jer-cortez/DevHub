"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestController = void 0;
const pullRequest_services_1 = require("../services/pullRequest.services");
exports.PullRequestController = {
    async findAll(_req, res) {
        try {
            const prs = await pullRequest_services_1.PullRequestServices.findAll();
            res.status(200).json({ data: prs });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch pull requests' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const pr = await pullRequest_services_1.PullRequestServices.findById(id);
            res.status(200).json({ data: pr });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch pull request' });
        }
    },
    async create(req, res) {
        try {
            const pr = await pullRequest_services_1.PullRequestServices.create(req.body);
            res.status(201).json({ data: pr });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create pull request' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await pullRequest_services_1.PullRequestServices.delete(id);
            res.status(200).json({ message: 'Pull request deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete pull request' });
        }
    },
    async findByRepo(req, res) {
        try {
            const repoId = req.params.repoId;
            const prs = await pullRequest_services_1.PullRequestServices.findByRepoId(repoId);
            res.status(200).json({ data: prs });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch pull requests for repository' });
        }
    },
    async sync(req, res) {
        try {
            const repoId = req.params.repoId;
            const prs = await pullRequest_services_1.PullRequestServices.syncFromGithub(repoId);
            res.status(200).json({ data: prs });
        }
        catch (error) {
            console.error('Failed to sync pull requests from GitHub:', error);
            res.status(500).json({ error: 'Failed to sync pull requests' });
        }
    },
};
