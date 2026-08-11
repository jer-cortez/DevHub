"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const users_services_1 = require("../services/users.services");
exports.UserController = {
    async findAll(_req, res) {
        try {
            const users = await users_services_1.UserServices.findAll();
            res.status(200).json({ data: users });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch all users' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const user = await users_services_1.UserServices.findById(id);
            res.status(200).json({ data: user });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    },
    async create(req, res) {
        try {
            const newUser = await users_services_1.UserServices.createUser(req.body);
            res.status(201).json({ data: newUser });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create user' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await users_services_1.UserServices.delete(id);
            res.status(200).json({ message: 'User deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },
};
