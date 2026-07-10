import type { pull_request, Prisma } from '../generated/prisma/browser';
import { prisma } from '../config/prismaClient';

export const PullRequestSB = { 
    async findAll() : Promise<pull_request[]> { 
        return prisma.pull_request.findMany();
    }, 
    async findById(id: string) : Promise<pull_request | null> { 
        return prisma.pull_request.findUnique({ 
            where: { id }
        })
    }
}