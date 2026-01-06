const express = require("express");
const router = express.Router();
const leadsController = require("../controllers/leadsController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for CSV uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "leads-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "text/csv" || path.extname(file.originalname).toLowerCase() === ".csv") {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files are allowed"), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// ✅ Create a new lead (only logged-in user)
router.post("/", authMiddleware, leadsController.createLead);

// ✅ Bulk upload leads from CSV
router.post("/upload-csv", authMiddleware, upload.single("file"), leadsController.uploadLeadsCSV);

// ✅ Get all leads for the logged-in user
router.get("/", authMiddleware, leadsController.getLeads);

// ✅ Update lead status by lead_id (only if it belongs to logged-in user)
router.patch("/:id/status", authMiddleware, leadsController.updateLeadStatus);

// ✅ Get all leads for a specific center (for academic admin)
router.get("/center/:centerId", authMiddleware, leadsController.getLeadsByCenter);

module.exports = router;
