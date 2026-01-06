// routes/centersRoutes.js

const express = require('express');
const router = express.Router();
const centersController = require('../controllers/centersController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all centers (secured via auth middleware)
router.get('/centers', authMiddleware, centersController.getAllCenters);

// Endpoint to fetch all offline centers (for academic admin) - MUST come before /centers/:id route
router.get('/centers/offline', authMiddleware, centersController.getOfflineCenters);

// Endpoint to fetch center by admin ID (secured via auth middleware)
router.get('/centers/admin/me', authMiddleware, centersController.getCenterByAdminId);

// Endpoint to fetch centers for the state where the authenticated user is the state_admin
router.get('/centers/state/admin/me', authMiddleware, centersController.getCentersForStateAdmin);

// Endpoint to fetch a single center by ID (secured via auth middleware) - MUST come last
router.get('/centers/:id', authMiddleware, centersController.getCenterById);

module.exports = router;
