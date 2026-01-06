const express = require("express");
const router = express.Router();
const cardAdminController = require("../controllers/cardAdminController");

// Get pending cards for verification
router.get("/card-admin/pending", cardAdminController.getPendingCards);

// Approve a card
router.post("/card-admin/approve/:id", cardAdminController.approveCard);

// Reject a card
router.post("/card-admin/reject/:id", cardAdminController.rejectCard);

// Get approved cards
router.get("/card-admin/approved", cardAdminController.getApprovedCards);

module.exports = router;
