// routes/academicNotificationsRoutes.js
const express = require("express");
const router = express.Router();
const { getAcademicNotifications, markAcademicNotificationAsRead } = require("../controllers/academicNotificationsController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/academic/notifications - Fetch all notifications for academic coordinator
router.get("/academic/notifications", authMiddleware, getAcademicNotifications);

// PATCH /api/academic/notifications/:id - Mark a notification as read
router.patch("/academic/notifications/:id", authMiddleware, markAcademicNotificationAsRead);

module.exports = router;

