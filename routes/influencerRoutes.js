const express = require("express");
const router = express.Router();
const {
    registerInfluencer,
    getInfluencerCount,
    getAllInfluencers, // ✅ New import
} = require("../controllers/influencerController");

router.post("/influencers", registerInfluencer);
router.get("/influencers/count", getInfluencerCount);
router.get("/influencers", getAllInfluencers); // ✅ Now fetches all influencers

module.exports = router;
