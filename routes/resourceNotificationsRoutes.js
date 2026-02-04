const express = require('express');
const router = express.Router();
const resourceNotificationsController = require('../controllers/resourceNotificationsController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming this exists based on other routes

// GET /api/resource/notifications
router.get(
    '/resource/notifications', 
    authMiddleware, 
    resourceNotificationsController.getResourceNotifications
);

// PATCH /api/resource/notifications/:id
router.patch(
    '/resource/notifications/:id', 
    authMiddleware, 
    resourceNotificationsController.markResourceNotificationAsRead
);

module.exports = router;
