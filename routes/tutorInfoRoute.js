// routes/tutorInfoRoute.js

const express = require("express");
const router = express.Router();
const multer = require("multer");

// Controllers & middleware
const tutorInfoController = require("../controllers/tutorInfoController");
const authMiddleware = require("../middleware/authMiddleware");

// -------------------- MULTER SETUP --------------------
// Use memory storage for profile photo uploads
const upload = multer({ storage: multer.memoryStorage() });

// -------------------- TUTOR INFO ROUTES --------------------

// GET: Fetch logged-in tutor's info
router.get("/", authMiddleware, tutorInfoController.getMyTutorInfo);

// POST: Create tutor info (only if not already exists)
router.post("/", authMiddleware, tutorInfoController.createTutorInfo);

// PUT: Update existing tutor info
router.put("/", authMiddleware, tutorInfoController.updateTutorInfo);

// DELETE: Delete tutor info
router.delete("/", authMiddleware, tutorInfoController.deleteTutorInfo);

// POST: Upload tutor profile photo
// Form-data key must be 'file'
router.post(
  "/upload-profile",
  authMiddleware,
  upload.single("file"),
  tutorInfoController.uploadProfilePhoto
);

// GET: Get tutor info by user ID (for admin/manager use)
router.get("/user/:userId", authMiddleware, tutorInfoController.getTutorInfoByUserId);

module.exports = router;
