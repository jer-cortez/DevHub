"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardsController = void 0;
const drawingBoards_services_1 = require("../services/drawingBoards.services");
const users_services_1 = require("../services/users.services");
exports.DrawingBoardsController = {
    async findAll(_req, res) {
        try {
            const boards = await drawingBoards_services_1.DrawingBoardsServices.findAll();
            res.status(200).json({ data: boards });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch drawing boards' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const board = await drawingBoards_services_1.DrawingBoardsServices.findById(id);
            res.status(200).json({ data: board });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch drawing board' });
        }
    },
    async create(req, res) {
        try {
            // created_by must come from the authenticated user, not the request
            // body — otherwise any client could claim a board was created by
            // anyone. It also has to be the local `users.id` (Prisma's own UUID),
            // not req.user.id (the Supabase Auth UUID) — those are different
            // ids, same distinction every other author_id/created_by column in
            // this schema already relies on.
            const author = await users_services_1.UserServices.upsertByGithubId({
                github_id: req.user.github_id,
                username: req.user.username,
                avatar_url: req.user.avatar_url,
                email: req.user.email,
            });
            const board = await drawingBoards_services_1.DrawingBoardsServices.create({
                ...req.body,
                created_by: author.id,
            });
            res.status(201).json({ data: board });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create drawing board' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await drawingBoards_services_1.DrawingBoardsServices.delete(id);
            res.status(200).json({ message: 'Drawing board deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete drawing board' });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const data = req.body;
            await drawingBoards_services_1.DrawingBoardsServices.update(id, data);
            res.status(200).json({ message: 'Drawing board Updated' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update drawing board' });
        }
    },
    async findByRepoId(req, res) {
        try {
            const repoId = req.params.repoId;
            const boards = await drawingBoards_services_1.DrawingBoardsServices.findByRepoId(repoId);
            res.status(200).json({ data: boards });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch boards by repo id' });
        }
    }
};
