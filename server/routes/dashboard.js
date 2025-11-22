const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboard');

// All routes require authentication
router.use(authenticate);

// Dashboard routes
router.get('/overview', dashboardController.getOverview);
router.get('/production-stats', dashboardController.getProductionStats);
router.get('/sales-stats', dashboardController.getSalesStats);
router.get('/inventory-status', dashboardController.getInventoryStatus);
router.get('/financial-summary', dashboardController.getFinancialSummary);

module.exports = router;
