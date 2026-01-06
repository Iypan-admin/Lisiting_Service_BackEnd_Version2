const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all courses (secured via auth middleware)
router.get('/courses', authMiddleware, coursesController.getAllCourses);

// Endpoint to fetch a single course by ID (secured via auth middleware)
router.get('/courses/:id', authMiddleware, coursesController.getCourseById);

module.exports = router;