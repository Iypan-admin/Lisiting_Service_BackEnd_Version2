// routes/notesRoutes.js

const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all notes (secured via auth middleware)
router.get('/notes', authMiddleware, notesController.getAllNotes);

// Endpoint to fetch a single note by ID (secured via auth middleware)
router.get('/notes/:id', authMiddleware, notesController.getNoteById);

module.exports = router;
