const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { requireFinance, requireRead } = require('../middlewares/role');
const {
    getPurchases,
    getPurchaseById,
    createPurchase,
    updatePurchase,
    updatePurchaseStatus,
    getPurchaseSummary
} = require('../controllers/purchases');

// All routes require authentication
router.use(authenticate);

// View purchases: all authenticated users (read-only)
router.get('/', requireRead, getPurchases);
router.get('/summary', requireRead, getPurchaseSummary);
router.get('/:id', requireRead, getPurchaseById);

// Create/update purchases: admin, accountant
router.post('/', requireFinance, createPurchase);
router.put('/:id', requireFinance, updatePurchase);
router.patch('/:id/status', requireFinance, updatePurchaseStatus);

module.exports = router;
