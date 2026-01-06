const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const {
    uploadGiveawayCSV,
    addGiveawayManual,
    getAllGiveaways,
    getCardStats,
    getRecentPendingCards
} = require("../controllers/cardActivationsController");

// ✅ Upload CSV → /api/giveaway/upload
router.post("/upload", upload.single("file"), uploadGiveawayCSV);

// ✅ Manual single insert → /api/giveaway/manual
router.post("/manual", addGiveawayManual);

// ✅ Get all giveaways → /api/giveaway
router.get("/", getAllGiveaways);

// ✅ Card statistics → /api/giveaway/stats
router.get("/stats", getCardStats);

// ✅ Recent pending cards → /api/giveaway/recent-pending
router.get("/recent-pending", getRecentPendingCards);

module.exports = router;
