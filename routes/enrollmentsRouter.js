// routes/enrollmentsRoutes.js

const express = require('express');
const router = express.Router();
const enrollmentsController = require('../controllers/enrollmentsController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all enrollments (secured via auth middleware)
router.get('/enrollments', authMiddleware, enrollmentsController.getAllEnrollments);

// Endpoint to fetch a single enrollment by ID (secured via auth middleware)
router.get('/enrollments/:id', authMiddleware, enrollmentsController.getEnrollmentById);

// Endpoint to fetch enrollments for a specific student (batch history)
router.get('/enrollments/student/:studentId', authMiddleware, enrollmentsController.getEnrollmentsByStudent);

module.exports = router;
