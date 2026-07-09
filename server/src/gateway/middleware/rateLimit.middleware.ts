import type { Request, Response, NextFunction } from 'express';

export const githubRateLimiter = async (
    req : Request, 
    res : Response, 
    next: NextFunction
) : Promise<void> =>  { 
    return 
}