"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsController = void 0;
const reviews_services_1 = require("../services/reviews.services");
exports.ReviewsController = {
    async findAll(_req, res) {
        try {
            const reviews = await reviews_services_1.ReviewsServices.findAll();
            res.status(200).json({ data: reviews });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const review = await reviews_services_1.ReviewsServices.findById(id);
            res.status(200).json({ data: review });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch review' });
        }
    },
    async create(req, res) {
        try {
            const review = await reviews_services_1.ReviewsServices.create(req.body);
            res.status(201).json({ data: review });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create review' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await reviews_services_1.ReviewsServices.delete(id);
            res.status(200).json({ message: 'Review deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete review' });
        }
    },
};
