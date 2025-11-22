const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const inventoryController = require('../controllers/inventory');
const { authenticate } = require('../middlewares/auth');
const { requireWarehouse, requireStockAdjustment, requireRead, canView } = require('../middlewares/role');

// All routes require authentication
router.use(authenticate);

// Routes for raw materials
// View: all authenticated users (read-only for non-warehouse)
router.get('/raw-materials', requireRead, inventoryController.getRawMaterials);

// Create/update: admin, warehouse_manager
router.post('/raw-materials', requireWarehouse, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').isIn(['Paddy', 'Packaging', 'Chemical', 'Other']).withMessage('Invalid category'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('unit').isIn(['kg', 'liters', 'bags', 'pieces']).withMessage('Invalid unit'),
  body('minimumStock').optional().isFloat({ min: 0 }).withMessage('Minimum stock must be a positive number'),
  body('supplier').optional().trim(),
  body('costPerUnit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
], inventoryController.createRawMaterial);

router.put('/raw-materials/:id', requireWarehouse, inventoryController.updateRawMaterial);
router.delete('/raw-materials/:id', requireWarehouse, inventoryController.deleteRawMaterial);

// Stock adjustments: admin only (warehouse_manager needs admin approval)
router.patch('/raw-materials/:id/adjust-stock', requireStockAdjustment, [
  body('adjustment').isFloat().withMessage('Adjustment must be a number'),
  body('reason').optional().trim(),
], inventoryController.adjustRawMaterialStock);

// Routes for finished goods
// View: all authenticated users (read-only for non-warehouse)
router.get('/finished-goods', requireRead, inventoryController.getFinishedGoods);

// Create/update: admin, warehouse_manager
router.post('/finished-goods', requireWarehouse, [
  body('batchId').isMongoId().withMessage('Valid batch ID is required'),
  body('paddyType').isIn(['nadu', 'samba']).withMessage('Invalid paddy type'),
  body('riceGrade').isIn(['premium', 'standard', 'broken']).withMessage('Invalid rice grade'),
  body('weightKg').isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('bagCount').isInt({ min: 1 }).withMessage('Bag count must be at least 1'),
  body('bagWeightKg').isIn([1, 5, 10, 25, 50]).withMessage('Invalid bag weight'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
  body('pricePerKg').optional().isFloat({ min: 0 }).withMessage('Price per kg must be a positive number'),
], inventoryController.createFinishedGood);

router.put('/finished-goods/:id', requireWarehouse, inventoryController.updateFinishedGood);
router.delete('/finished-goods/:id', requireWarehouse, inventoryController.deleteFinishedGood);

// Stock adjustments: admin only
router.patch('/finished-goods/:id/adjust-stock', requireStockAdjustment, [
  body('adjustment').isFloat().withMessage('Adjustment must be a number'),
  body('reason').optional().trim(),
], inventoryController.adjustFinishedGoodStock);

// Summary and alerts routes - read-only for all authenticated users
router.get('/summary', requireRead, inventoryController.getInventorySummary);
router.get('/low-stock-alerts', requireRead, inventoryController.getLowStockAlerts);

module.exports = router;
