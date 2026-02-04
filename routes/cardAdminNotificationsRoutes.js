const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const { 
    getCardAdminNotifications, 
    markCardAdminNotificationAsRead 
} = require("../controllers/cardAdminNotificationsController");

// Get all notifications for the logged-in card admin
router.get("/notifications", authenticate, getCardAdminNotifications);

// Mark a notification as read
router.patch("/notifications/:id", authenticate, markCardAdminNotificationAsRead);

module.exports = router;
