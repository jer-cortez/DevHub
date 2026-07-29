"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentsController = void 0;
const reviewComments_services_1 = require("../services/reviewComments.services");
exports.ReviewCommentsController = {
    async findAll(_req, res) {
        try {
            const comments = await reviewComments_services_1.ReviewCommentsServices.findAll();
            res.status(200).json({ data: comments });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch review comments' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const comment = await reviewComments_services_1.ReviewCommentsServices.findById(id);
            res.status(200).json({ data: comment });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch review comment' });
        }
    },
    async create(req, res) {
        try {
            const comment = await reviewComments_services_1.ReviewCommentsServices.create(req.body);
            res.status(201).json({ data: comment });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create review comment' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await reviewComments_services_1.ReviewCommentsServices.delete(id);
            res.status(200).json({ message: 'Review comment deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete review comment' });
        }
    },
};
