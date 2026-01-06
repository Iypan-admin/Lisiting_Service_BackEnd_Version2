const express = require('express');
const router = express.Router();
const academicCoordinatorsController = require('../controllers/academicCoordinatorsController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to fetch all academic coordinators (secured via auth middleware)
router.get('/academic-coordinators', authMiddleware, academicCoordinatorsController.getAllAcademicCoordinators);

// Route to fetch a single academic coordinator by ID (secured via auth middleware)
router.get('/academic-coordinators/:id', authMiddleware, academicCoordinatorsController.getAcademicCoordinatorById);

module.exports = router;
