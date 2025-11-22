const express = require('express');
const router = express.Router();
const {
    getActivityLogs,
    getActivityStats,
    deleteOldLogs
} = require('../controllers/activityLog');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');

// Protect all routes - admin only
router.use(authenticate);
router.use(requireAdmin);

// Routes
router.get('/', getActivityLogs);
router.get('/stats', getActivityStats);
router.delete('/cleanup', deleteOldLogs);

module.exports = router;
