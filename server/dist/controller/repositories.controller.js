"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesController = void 0;
const repositories_services_1 = require("../services/repositories.services");
exports.RepositoriesController = {
    async findAll(_req, res) {
        try {
            const repos = await repositories_services_1.RepositoriesServices.findAll();
            res.status(200).json({ data: repos });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch repositories' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const repo = await repositories_services_1.RepositoriesServices.findById(id);
            res.status(200).json({ data: repo });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch repository' });
        }
    },
    async create(req, res) {
        try {
            const repo = await repositories_services_1.RepositoriesServices.create(req.body);
            res.status(201).json({ data: repo });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create repository' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await repositories_services_1.RepositoriesServices.delete(id);
            res.status(200).json({ message: 'Repository deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete repository' });
        }
    },
    async sync(_req, res) {
        try {
            const repos = await repositories_services_1.RepositoriesServices.syncFromGithub();
            res.status(200).json({ data: repos });
        }
        catch (error) {
            console.error('Failed to sync repositories from GitHub:', error);
            res.status(500).json({ error: 'Failed to sync repositories' });
        }
    },
    async listActivity(_req, res) {
        try {
            const activity = await repositories_services_1.RepositoriesServices.listActivity();
            res.status(200).json({ data: activity });
        }
        catch (error) {
            console.error('Failed to fetch repository activity:', error);
            res.status(500).json({ error: 'Failed to fetch repository activity' });
        }
    },
};
