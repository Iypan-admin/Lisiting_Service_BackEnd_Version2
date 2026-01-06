const express = require('express');
const router = express.Router();
const { addEliteCard, getEliteCards, getCardNameByNumber } = require('../controllers/eliteCardsController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authMiddleware to both routes to extract center_id from token
router.post('/elite-cards', authMiddleware, addEliteCard);
router.get('/elite-cards', authMiddleware, getEliteCards);
router.get('/elite-cards/card-name', authMiddleware, getCardNameByNumber);

module.exports = router;
