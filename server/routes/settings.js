const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');
const {
    getMillSettings,
    updateMillSettings
} = require('../controllers/settings');

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);

// GET /api/v1/settings/mill - Get mill settings
router.get('/mill', getMillSettings);

// PUT /api/v1/settings/mill - Update mill settings (admin only)
router.put('/mill', requireAdmin, updateMillSettings);

module.exports = router;
