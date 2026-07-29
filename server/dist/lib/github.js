"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.octokit = void 0;
const rest_1 = require("@octokit/rest");
exports.octokit = new rest_1.Octokit({
    auth: process.env.GITHUB_APP_TOKEN,
});
