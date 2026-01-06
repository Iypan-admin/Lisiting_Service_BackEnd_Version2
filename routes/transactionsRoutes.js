// routes/transactionsRoutes.js

const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all transactions (secured via auth middleware)
router.get('/transactions', authMiddleware, transactionsController.getAllTransactions);

// Endpoint to fetch a single transaction by payment_id (secured via auth middleware)
router.get('/transactions/:id', authMiddleware, transactionsController.getTransactionById);

module.exports = router;
