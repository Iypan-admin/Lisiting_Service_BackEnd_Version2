// routes/centerNotificationsRoutes.js
const express = require("express");
const router = express.Router();
const { getCenterNotifications, markCenterNotificationAsRead } = require("../controllers/centerNotificationsController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/center/notifications - Fetch all notifications for center admin
router.get("/center/notifications", authMiddleware, getCenterNotifications);

// PATCH /api/center/notifications/:id - Mark a notification as read
router.patch("/center/notifications/:id", authMiddleware, markCenterNotificationAsRead);

module.exports = router;
