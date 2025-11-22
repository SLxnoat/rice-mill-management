const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { requireProduction, requireRead, canView } = require('../middlewares/role');
const {
    getBatches,
    getBatchById,
    createBatch,
    updateBatch,
    completeBatch
} = require('../controllers/production');

// All routes require authentication
router.use(authenticate);

// View batches: all authenticated users (read-only for non-operators)
router.get('/batches', requireRead, getBatches);
router.get('/batches/:id', requireRead, getBatchById);

// Create/update/complete batches: admin, operator
router.post('/batches', requireProduction, createBatch);
router.put('/batches/:id', requireProduction, updateBatch);
router.post('/batches/:id/complete', requireProduction, completeBatch);

module.exports = router;
