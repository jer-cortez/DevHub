"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditsController = void 0;
const audits_services_1 = require("../services/audits.services");
const currentUser_services_1 = require("../services/currentUser.services");
function fail(res, error) {
    if (error instanceof audits_services_1.AuditServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
    }
    console.error('Audit request failed:', error);
    res.status(500).json({ error: 'Audit request failed' });
}
exports.AuditsController = {
    async request(req, res) {
        try {
            res.status(202).json({ data: await audits_services_1.AuditServices.request(req.params.id) });
        }
        catch (error) {
            fail(res, error);
        }
    },
    async listForPr(req, res) {
        try {
            res.status(200).json({ data: await audits_services_1.AuditServices.listForPr(req.params.id) });
        }
        catch (error) {
            fail(res, error);
        }
    },
    async get(req, res) {
        try {
            res.status(200).json({ data: await audits_services_1.AuditServices.get(req.params.id) });
        }
        catch (error) {
            fail(res, error);
        }
    },
    async cancel(req, res) {
        try {
            res.status(200).json({ data: await audits_services_1.AuditServices.cancel(req.params.id) });
        }
        catch (error) {
            fail(res, error);
        }
    },
    async feedback(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const data = await audits_services_1.AuditServices.feedback(req.params.id, req.body.finding_id, user.id, req.body.verdict);
            res.status(200).json({ data });
        }
        catch (error) {
            fail(res, error);
        }
    },
};
