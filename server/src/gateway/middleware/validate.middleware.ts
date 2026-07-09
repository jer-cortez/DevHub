import type { Request, Response, NextFunction } from 'express';

// This file would check the request body of any routes (API Endpoints) that do things like update, create.  

export const userValidate = async (
    res: Response, 
    req: Request, 
    next: NextFunction
): Promise<void> => { 
    return
}