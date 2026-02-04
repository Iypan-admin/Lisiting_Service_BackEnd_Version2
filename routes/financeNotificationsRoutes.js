const express = require('express');
const router = express.Router();
const financeNotificationsController = require('../controllers/financeNotificationsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, financeNotificationsController.getNotifications);
router.put('/:id/read', authMiddleware, financeNotificationsController.markAsRead);

module.exports = router;
