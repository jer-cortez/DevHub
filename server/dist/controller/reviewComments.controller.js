"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentsController = void 0;
const reviewComments_services_1 = require("../services/reviewComments.services");
const common_schemas_1 = require("../schemas/common.schemas");
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
    /** Comment counts for multiple PRs at once, e.g. GET /counts?prIds=a,b,c — used to populate the PR list's comment-count badges in one request instead of one per PR. */
    async countByPrIds(req, res) {
        try {
            const prIds = (0, common_schemas_1.parseUuidListQuery)(req.query.prIds);
            const counts = await reviewComments_services_1.ReviewCommentsServices.countByPrIds(prIds);
            res.status(200).json({ data: counts });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch comment counts' });
        }
    },
    /** Same, for issues — GET /issue-counts?issueIds=a,b,c. */
    async countByIssueIds(req, res) {
        try {
            const issueIds = (0, common_schemas_1.parseUuidListQuery)(req.query.issueIds);
            const counts = await reviewComments_services_1.ReviewCommentsServices.countByIssueIds(issueIds);
            res.status(200).json({ data: counts });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch issue comment counts' });
        }
    },
};
