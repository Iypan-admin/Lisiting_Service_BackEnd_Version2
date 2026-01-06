// routes/studentsRoutes.js

const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');

const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all students (secured via auth middleware)
router.get('/students', authMiddleware, studentsController.getAllStudents);

// Endpoint to fetch a single student by ID (secured via auth middleware)
router.get('/students/:id', authMiddleware, studentsController.getStudentById);

// Endpoint to fetch students by batch ID
router.get('/students/batch/:batchId', studentsController.getStudentsByBatch);

// Add this route with your other routes
router.get('/students/center/:centerId', authMiddleware, studentsController.getStudentsByCenter);

// Endpoint to fetch students referred by a specific center
router.get('/students/referred/:centerId', authMiddleware, studentsController.getReferredStudents);




router.get('/by-register/:registerNumber', studentsController.getStudentNameByRegisterNumber);





module.exports = router;
