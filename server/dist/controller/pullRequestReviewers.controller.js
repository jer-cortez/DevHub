"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestReviewersController = void 0;
const pullRequestReviewers_services_1 = require("../services/pullRequestReviewers.services");
exports.PullRequestReviewersController = {
    async findAll(_req, res) {
        try {
            const reviewers = await pullRequestReviewers_services_1.PullRequestReviewersServices.findAll();
            res.status(200).json({ data: reviewers });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch pull request reviewers' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const reviewer = await pullRequestReviewers_services_1.PullRequestReviewersServices.findById(id);
            res.status(200).json({ data: reviewer });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch pull request reviewer' });
        }
    },
    async create(req, res) {
        try {
            const reviewer = await pullRequestReviewers_services_1.PullRequestReviewersServices.create(req.body);
            res.status(201).json({ data: reviewer });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create pull request reviewer' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await pullRequestReviewers_services_1.PullRequestReviewersServices.delete(id);
            res.status(200).json({ message: 'Pull request reviewer deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete pull request reviewer' });
        }
    },
};
