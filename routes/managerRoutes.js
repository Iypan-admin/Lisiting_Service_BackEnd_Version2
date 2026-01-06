// routes/managerRoutes.js

const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all managers (secured via auth middleware)
router.get('/managers', authMiddleware, managerController.getAllManagers);

// Endpoint to fetch a single manager by ID (secured via auth middleware)
router.get('/managers/:id', authMiddleware, managerController.getManagerById);

module.exports = router;
