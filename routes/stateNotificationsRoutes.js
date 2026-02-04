// routes/stateNotificationsRoutes.js
const express = require('express');
const router = express.Router();
const stateNotificationsController = require('../controllers/stateNotificationsController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all notifications for the logged-in state admin
router.get('/state/notifications', authMiddleware, stateNotificationsController.getStateNotifications);

// Mark a specific notification as read
router.patch('/state/notifications/:id', authMiddleware, stateNotificationsController.markStateNotificationAsRead);

module.exports = router;
