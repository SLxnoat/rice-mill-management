const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const inventoryMovementController = require('../controllers/inventoryMovement');
const { authenticate } = require('../middlewares/auth');
const { checkRoles } = require('../middlewares/role');

// All routes require authentication
router.use(authenticate);

// Get all inventory movements
router.get('/', inventoryMovementController.getMovements);

// Get movement summary
router.get('/summary', inventoryMovementController.getMovementSummary);

// Get product history
router.get('/product/:productId/history', inventoryMovementController.getProductHistory);

// Get stock balance
router.get('/product/:productId/balance', inventoryMovementController.getStockBalance);

// Get movements by reference
router.get('/ref/:refType/:refId', inventoryMovementController.getMovementsByRef);

// Create manual adjustment (admin, warehouse_manager)
router.post('/adjust',
  checkRoles('admin', 'warehouse_manager'),
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('qtyKg').isFloat().withMessage('Quantity must be a number'),
    body('reason').optional().trim(),
  ],
  inventoryMovementController.createAdjustment
);

module.exports = router;

