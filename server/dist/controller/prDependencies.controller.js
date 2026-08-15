"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrDependenciesController = void 0;
const prDependencies_services_1 = require("../services/prDependencies.services");
const currentUser_services_1 = require("../services/currentUser.services");
const common_schemas_1 = require("../schemas/common.schemas");
exports.PrDependenciesController = {
    async getForPr(req, res) {
        try {
            const prId = req.params.prId;
            res.status(200).json({ data: await prDependencies_services_1.PrDependenciesServices.getForPr(prId) });
        }
        catch (error) {
            console.error('Failed to fetch PR dependencies:', error);
            res.status(500).json({ error: 'Failed to fetch dependencies' });
        }
    },
    async link(req, res) {
        try {
            const blockedPrId = req.params.prId;
            const { blocking_pr_id: blockingPrId, note } = req.body ?? {};
            if (!blockingPrId) {
                return res.status(400).json({ error: 'blocking_pr_id is required' });
            }
            // Must be the local users.id — req.user.id is the Supabase Auth UUID and
            // would violate the created_by foreign key.
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const dependency = await prDependencies_services_1.PrDependenciesServices.link(blockedPrId, blockingPrId, user.id, note);
            res.status(201).json({ data: dependency });
        }
        catch (error) {
            // Cycles, self-blocks, and non-open PRs are all user-correctable, so
            // they get a 400 with the explanation rather than a generic 500.
            if (error instanceof prDependencies_services_1.DependencyError) {
                return res.status(400).json({ error: error.message });
            }
            console.error('Failed to link PR dependency:', error);
            res.status(500).json({ error: 'Failed to link dependency' });
        }
    },
    async unlink(req, res) {
        try {
            await prDependencies_services_1.PrDependenciesServices.unlink(req.params.dependencyId);
            res.status(200).json({ data: { message: 'Dependency removed' } });
        }
        catch (error) {
            if (error instanceof prDependencies_services_1.DependencyError) {
                return res.status(404).json({ error: error.message });
            }
            console.error('Failed to unlink PR dependency:', error);
            res.status(500).json({ error: 'Failed to remove dependency' });
        }
    },
    async blockedCounts(req, res) {
        try {
            const ids = (0, common_schemas_1.parseUuidListQuery)(req.query.prIds);
            res.status(200).json({ data: await prDependencies_services_1.PrDependenciesServices.blockedCounts(ids) });
        }
        catch (error) {
            console.error('Failed to fetch blocked counts:', error);
            res.status(500).json({ error: 'Failed to fetch blocked counts' });
        }
    },
};
