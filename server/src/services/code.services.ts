import { RepositoriesServices } from "./repositories.services"
import { octokit } from '../lib/github';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

export const codeServices = { 
    async getContents(repoId: string, path: string) { 
        const repo = await RepositoriesServices.findById(repoId); 

        const { data } = await octokit.rest.repos.getContent(
            { owner: ORG_NAME, repo: repo.name, path, ref: repo.default_branch }
        )

        if (Array.isArray(data)) {
            return data
        }

        if (data.type === 'file' && 'content' in data) {
            return {
                type: 'file' as const,
                name: data.name,
                path: data.path,
                size: data.size,
                content: Buffer.from(data.content, 'base64').toString('utf-8'),
            };
        }

        throw new Error(`Unsupported content type at path "${path}"`);
    }

}