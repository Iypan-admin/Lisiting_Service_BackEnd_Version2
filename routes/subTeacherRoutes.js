const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/subTeacherController');

const router = express.Router();

// Teacher endpoints
router.post('/teacher/leave-requests', authMiddleware, ctrl.createRequest);
router.get('/teacher/leave-requests', authMiddleware, ctrl.getMyRequests);
router.put('/teacher/leave-requests/:id', authMiddleware, ctrl.updateRequest);
router.delete('/teacher/leave-requests/:id', authMiddleware, ctrl.deleteRequest);
router.get('/teacher/effective-batches', authMiddleware, ctrl.getEffectiveBatchesForDate);

// Academic/Admin endpoints
router.get('/academic/sub-tutor-requests', authMiddleware, ctrl.adminListRequests);
router.post('/academic/sub-tutor-requests/:id/approve', authMiddleware, ctrl.approveRequest);
router.post('/academic/sub-tutor-requests/:id/reject', authMiddleware, ctrl.rejectRequest);

module.exports = router;





