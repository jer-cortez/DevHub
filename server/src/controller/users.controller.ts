import type { Response, Request } from 'express'; 
import { UserServices } from '../services/users.services';
import { User } from '../generated/prisma/client';


export const UserController = { 
    async findAll(req: Request, res: Response) { 
        try { 
            const users = await UserServices.findAll(); 
            res.status(200).json({ data: users });
        }
        catch(error) { 
            res.status(500).json({ error: "Failed to fetch all users"})
        }
    }, 
    async findById(req: Request, res: Response) { 
        try { 
            const id =  req.params.id as string // type should be single string
            const user = await UserServices.findById(id)
            res.status(200).json({ data: user})
        } catch(error: any) { 
            res.status(500).json({ error: "Failed to fetch user"})
        }
    }, 
    async create(req: Request, res: Response) { 
        try { 
            const newUserBody = req.body
            const newUser = UserServices.creatUser(newUserBody)
            res.status(200).json({ data: newUser })
        } catch(error: any) { 
            res.status(500).json({ error: "Failed to create user"})
        }
    },
}