"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgHealthController = void 0;
const orgHealth_services_1 = require("../services/orgHealth.services");
exports.OrgHealthController = {
    async getDashboard(_req, res) {
        try {
            const health = await orgHealth_services_1.OrgHealthServices.getDashboard();
            res.status(200).json({ data: health });
        }
        catch (error) {
            console.error('Failed to build org health dashboard:', error);
            res.status(500).json({ error: 'Failed to load org health' });
        }
    },
};
