// routes/usersRoutes.js

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all users (secured via auth middleware)
router.get('/users', authMiddleware, usersController.getAllUsers);

// Endpoint to fetch a single user by ID (secured via auth middleware)
router.get('/users/:id', authMiddleware, usersController.getUserById);

module.exports = router;
