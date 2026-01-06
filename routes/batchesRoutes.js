// routes/batchesRoutes.js

const express = require('express');
const router = express.Router();
const batchesController = require('../controllers/batchesController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint to fetch all batches (secured via auth middleware)
router.get('/admin/batches', authMiddleware, batchesController.getAllBatches);

// Endpoint to fetch a single batch by ID (secured via auth middleware)
router.get('/batches/:id', authMiddleware, batchesController.getBatchById);

// Endpoint to fetch batches by center (secured via auth middleware)
router.get('/center/:centerId', authMiddleware, batchesController.getBatchesByCenter);

// Endpoint to create a new batch (secured via auth middleware)
router.post('/', authMiddleware, batchesController.createBatch);

// Endpoint to update a batch (secured via auth middleware)
router.put('/:id', authMiddleware, batchesController.updateBatch);

// Endpoint to delete a batch (secured via auth middleware)
router.delete('/:id', authMiddleware, batchesController.deleteBatch);

module.exports = router;
