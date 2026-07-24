import type { Request, Response } from "express";
import { AuthHandler } from "../services/auth.services";
import { UserServices } from "../services/users.services";

export const AuthController = {
  async login(req: Request, res: Response) {
    try {
      const { username, email, avatar_url, github_id } = req.user!;
      const user = await UserServices.upsertByGithubId({
        github_id,
        username,
        avatar_url,
        email,
      });
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ error: "Failed to log in user" });
    }
  },
};

