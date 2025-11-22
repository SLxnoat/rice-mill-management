const express = require('express');
const router = express.Router();
const {
    getPricings,
    getCurrentPrice,
    createPricing,
    updatePricing,
    deletePricing,
    getPriceHistory
} = require('../controllers/pricing');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');

// Protect all routes
router.use(authenticate);

// Price history
router.get('/history/:productId', getPriceHistory);

// Current price
router.get('/current/:productId', getCurrentPrice);

// CRUD routes
router.route('/')
    .get(getPricings)
    .post(requireAdmin, createPricing);

router.route('/:id')
    .put(requireAdmin, updatePricing)
    .delete(requireAdmin, deletePricing);

module.exports = router;
