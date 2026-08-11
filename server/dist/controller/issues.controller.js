"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssuesController = void 0;
const issues_services_1 = require("../services/issues.services");
exports.IssuesController = {
    async findByRepoId(req, res) {
        try {
            const issues = await issues_services_1.IssuesServices.findByRepoId(req.params.repoId);
            res.status(200).json({ data: issues });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch issues' });
        }
    },
    async findById(req, res) {
        try {
            const issue = await issues_services_1.IssuesServices.findById(req.params.id);
            res.status(200).json({ data: issue });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch issue' });
        }
    },
    async sync(req, res) {
        try {
            const issues = await issues_services_1.IssuesServices.syncFromGithub(req.params.repoId);
            res.status(200).json({ data: issues });
        }
        catch (error) {
            console.error('Failed to sync issues from GitHub:', error);
            res.status(500).json({ error: 'Failed to sync issues' });
        }
    },
};
