// routes/managerNotificationsRoutes.js
const express = require("express");
const router = express.Router();
const { getManagerNotifications, markManagerNotificationAsRead } = require("../controllers/managerNotificationsController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/manager/notifications - Fetch all notifications for manager
router.get("/manager/notifications", authMiddleware, getManagerNotifications);

// PATCH /api/manager/notifications/:id - Mark a notification as read
router.patch("/manager/notifications/:id", authMiddleware, markManagerNotificationAsRead);

module.exports = router;

