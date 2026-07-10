import type { Request, Response } from 'express'; 
import { PullRequestServices } from '../services/pullRequest.services';

export const PullRequestContoller = { 
    async findAll(req: Request, res: Response) { 
        try { 
            const prs = await PullRequestServices.findAll();
            res.status(200).json({ data: prs });
        } catch(error) { 
            res.status(500).json({ error: "Failed to fetch Pull Requests"});
        }
    }, 
    async findById(req: Request, res: Response) { 
        try { 
            const id = req.params.id as string;
            const pr = await PullRequestServices.findById(id);
            res.status(200).json({ data: pr });
        } catch(error: any) { 
            res.status(500).json({ error: "Failed to fetch Pull Request"})
        }
    }, 
    async create(req: Request, res: Response) { 
        try { 
            const data = req.body;
            const pr = PullRequestServices.create(data); 
            res.status(200).json({data: data})
        } catch(error: any) { 
            res.status(500).json({ error: "Failed to create Pull Request"})
        }
    }
}