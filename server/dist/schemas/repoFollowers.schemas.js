"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFollowPreferencesBody = exports.followRepoBody = void 0;
const zod_1 = require("zod");
const preferencesShape = {
    notify_pull_requests: zod_1.z.boolean().optional(),
    notify_issues: zod_1.z.boolean().optional(),
    notify_comments: zod_1.z.boolean().optional(),
};
exports.followRepoBody = zod_1.z.object({
    repoId: zod_1.z.uuid(),
    ...preferencesShape,
});
exports.updateFollowPreferencesBody = zod_1.z.object(preferencesShape);
