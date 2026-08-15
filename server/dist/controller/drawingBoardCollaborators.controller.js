"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardCollaboratorsController = void 0;
const drawingBoardCollaborators_services_1 = require("../services/drawingBoardCollaborators.services");
exports.DrawingBoardCollaboratorsController = {
    async findAll(_req, res) {
        try {
            const collabs = await drawingBoardCollaborators_services_1.DrawingBoardCollaboratorsServices.findAll();
            res.status(200).json({ data: collabs });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch board collaborators' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const collab = await drawingBoardCollaborators_services_1.DrawingBoardCollaboratorsServices.findById(id);
            res.status(200).json({ data: collab });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch board collaborator' });
        }
    },
    async create(req, res) {
        try {
            const collab = await drawingBoardCollaborators_services_1.DrawingBoardCollaboratorsServices.create(req.body);
            res.status(201).json({ data: collab });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create board collaborator' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await drawingBoardCollaborators_services_1.DrawingBoardCollaboratorsServices.delete(id);
            res.status(200).json({ message: 'Board collaborator deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete board collaborator' });
        }
    },
};
