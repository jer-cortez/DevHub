"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingRouter = void 0;
const express_1 = __importDefault(require("express"));
const onboarding_controller_1 = require("../../controller/onboarding.controller");
const router = express_1.default.Router();
exports.onboardingRouter = router;
router.get('/:prId', onboarding_controller_1.OnboardingController.getForPr);
