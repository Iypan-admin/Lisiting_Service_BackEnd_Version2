// routes/financialPartnersRoutes.js

const express = require('express');
const router = express.Router();
const financialPartnersController = require('../controllers/financialPartnersController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all financial partners (secured via auth middleware)
router.get('/financial-partners', authMiddleware, financialPartnersController.getAllFinancialPartners);

// Endpoint to fetch a single financial partner by ID (secured via auth middleware)
router.get('/financial-partners/:id', authMiddleware, financialPartnersController.getFinancialPartnerById);

module.exports = router;
