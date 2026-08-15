"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingController = void 0;
const onboarding_services_1 = require("../services/onboarding.services");
const currentUser_services_1 = require("../services/currentUser.services");
exports.OnboardingController = {
    async getForPr(req, res) {
        try {
            const prId = req.params.prId;
            // Onboarding is per-viewer by definition — resolveLocalUser, not
            // req.user.id, which is the Supabase Auth UUID rather than users.id.
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            res.status(200).json({ data: await onboarding_services_1.OnboardingServices.getForPr(prId, user.id) });
        }
        catch (error) {
            console.error('Failed to build onboarding view:', error);
            res.status(500).json({ error: 'Failed to load onboarding view' });
        }
    },
};
