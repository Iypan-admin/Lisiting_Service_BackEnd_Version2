// routes/adminNotificationsRoutes.js
const express = require("express");
const router = express.Router();
const { getAdminNotifications, markAdminNotificationAsRead } = require("../controllers/adminNotificationsController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/admin/notifications - Fetch all notifications for admin
router.get("/admin/notifications", authMiddleware, getAdminNotifications);

// PATCH /api/admin/notifications/:id - Mark a notification as read
router.patch("/admin/notifications/:id", authMiddleware, markAdminNotificationAsRead);

module.exports = router;
