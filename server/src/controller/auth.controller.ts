import type { Request, Response } from "express";
import { resolveLocalUser } from "../services/currentUser.services";
import { IdentityError } from "../services/identity.services";
import { publicUser } from "../services/publicUser";

export const AuthController = {
  async login(req: Request, res: Response) {
    try {
      res.status(200).json({ data: publicUser(await resolveLocalUser(req)) });
    } catch (error) {
      if (error instanceof IdentityError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      res.status(503).json({ error: "Failed to log in user" });
    }
  },
};
