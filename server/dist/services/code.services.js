"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeServices = void 0;
const repositories_services_1 = require("./repositories.services");
const github_1 = require("../lib/github");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
exports.codeServices = {
    async getContents(repoId, path) {
        const repo = await repositories_services_1.RepositoriesServices.findById(repoId);
        const { data } = await github_1.octokit.rest.repos.getContent({ owner: ORG_NAME, repo: repo.name, path, ref: repo.default_branch });
        if (Array.isArray(data)) {
            return data;
        }
        if (data.type === 'file' && 'content' in data) {
            return {
                type: 'file',
                name: data.name,
                path: data.path,
                size: data.size,
                content: Buffer.from(data.content, 'base64').toString('utf-8'),
            };
        }
        throw new Error(`Unsupported content type at path "${path}"`);
    }
};
