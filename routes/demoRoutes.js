const express = require("express");
const router = express.Router();
const demoController = require("../controllers/demoController");
const authMiddleware = require("../middleware/authMiddleware");

// =====================================================
// Demo Requests Routes
// =====================================================

// ✅ Create a demo request (called when lead status changes to demo_schedule)
router.post("/demo-requests", authMiddleware, demoController.createDemoRequest);

// ✅ Get all demo requests (for Academic Admin)
router.get("/demo-requests", authMiddleware, demoController.getDemoRequests);

// ✅ Get demo request by ID
router.get("/demo-requests/:id", authMiddleware, demoController.getDemoRequestById);

// =====================================================
// Demo Batches Routes
// =====================================================

// ✅ Create a demo batch
router.post("/demo-batches", authMiddleware, demoController.createDemoBatch);

// ✅ Get all demo batches
router.get("/demo-batches", authMiddleware, demoController.getDemoBatches);

// ✅ Get demo batch by ID
router.get("/demo-batches/:id", authMiddleware, demoController.getDemoBatchById);

// ✅ Update demo batch
router.put("/demo-batches/:id", authMiddleware, demoController.updateDemoBatch);

// ✅ Update demo batch class link (by Teacher)
router.patch("/demo-batches/:id/class-link", authMiddleware, demoController.updateDemoBatchClassLink);

// ✅ Update student attendance
router.patch("/demo-attendance", authMiddleware, demoController.updateDemoAttendance);

// ✅ Get demo details for a specific lead
router.get("/leads/:lead_id/demo", authMiddleware, demoController.getLeadDemoDetails);

module.exports = router;



