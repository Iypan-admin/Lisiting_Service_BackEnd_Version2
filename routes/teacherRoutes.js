// routes/teachersRoutes.js

const express = require('express');
const teachersController = require('../controllers/teachersController');
const teacherNotificationsController = require('../controllers/teacherNotificationsController');
const authMiddleware = require('../middleware/authMiddleware'); // Fix: 'middleware' instead of 'middlewares'

const router = express.Router();

// Endpoint to fetch all teachers (secured via auth middleware)
router.get('/teachers', authMiddleware, teachersController.getAllTeachers);

// Endpoint to fetch a single teacher by ID (secured via auth middleware)
router.get('/teachers/:id', authMiddleware, teachersController.getTeacherById);

// Teacher-specific endpoints
router.get('/teacher/batches', authMiddleware, teachersController.getTeacherBatches);
router.get('/teacher/students', authMiddleware, teachersController.getStudentsByTeacher);
router.get('/teacher/batch/:batchId/students', authMiddleware, teachersController.getTeacherBatchStudents);
router.get('/teacher/my-id', authMiddleware, teachersController.getMyTeacherId);
// router.get(':batchId/students', authMiddleware, teachersController.getTeacherBatchStudents);

// Add this new route
router.get('/center/:centerId/teachers', authMiddleware, teachersController.getTeachersByCenter);

// Teacher notifications endpoints
router.get('/teacher/notifications', authMiddleware, teacherNotificationsController.getNotifications);
router.patch('/teacher/notifications/:id', authMiddleware, teacherNotificationsController.markAsRead);

module.exports = router;
