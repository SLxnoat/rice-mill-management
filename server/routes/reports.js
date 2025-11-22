const express = require('express');
const router = express.Router();
const {
    getDailyProductionReport,
    getStockMovementReport,
    getProfitLossReport,
    getCustomerOutstandingReport,
    getMachinePerformanceReport,
    getAttendanceReport,
    getSummaryReport,
    getMillEconomicsReport
} = require('../controllers/reports');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');

// Protect all routes
router.use(authenticate);

// Report routes
router.get('/daily-production', getDailyProductionReport);
router.get('/stock-movement', getStockMovementReport);
router.get('/profit-loss', getProfitLossReport);
router.get('/customer-outstanding', getCustomerOutstandingReport);
router.get('/machine-performance', getMachinePerformanceReport);
router.get('/attendance', requireAdmin, getAttendanceReport);
router.get('/summary', getSummaryReport);
router.get('/mill-economics', getMillEconomicsReport);

module.exports = router;
