// routes/statesRoutes.js

const express = require('express');
const router = express.Router();
const statesController = require('../controllers/stateController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all states (secured via auth middleware)
router.get('/states', authMiddleware, statesController.getAllStates);

// Endpoint to fetch a single state by ID (secured via auth middleware)
router.get('/states/:id', authMiddleware, statesController.getStateById);

module.exports = router;
