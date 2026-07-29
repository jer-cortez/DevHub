"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardsController = void 0;
const drawingBoards_services_1 = require("../services/drawingBoards.services");
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
            const board = await drawingBoards_services_1.DrawingBoardsServices.create(req.body);
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
        catch (erros) {
            res.status(500).json({ error: 'Failed to update drawing board' });
        }
    }
};
