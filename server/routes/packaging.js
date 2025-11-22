const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const packagingController = require('../controllers/packaging');
const { authenticate } = require('../middlewares/auth');
const { checkRoles } = require('../middlewares/role');

// All routes require authentication
router.use(authenticate);

// Get all packaging
router.get('/', packagingController.getPackaging);

// Get packaging by type
router.get('/type/:type', packagingController.getPackagingByType);

// Get low stock packaging
router.get('/low-stock', packagingController.getLowStockPackaging);

// Get packaging summary
router.get('/summary', packagingController.getPackagingSummary);

// Get single packaging
router.get('/:id', packagingController.getPackagingById);

// Create packaging (admin, warehouse_manager)
router.post('/',
  checkRoles('admin', 'warehouse_manager'),
  [
    body('type').isIn(['10kg', '25kg', '50kg', 'bulk', 'custom']).withMessage('Invalid packaging type'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('weightKg').isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    body('costPerUnit').isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  ],
  packagingController.createPackaging
);

// Update packaging (admin, warehouse_manager)
router.put('/:id',
  checkRoles('admin', 'warehouse_manager'),
  packagingController.updatePackaging
);

// Delete packaging (admin only)
router.delete('/:id',
  checkRoles('admin'),
  packagingController.deletePackaging
);

// Add packaging stock
router.post('/:id/add-stock',
  checkRoles('admin', 'warehouse_manager'),
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  packagingController.addPackagingStock
);

// Remove packaging stock
router.post('/:id/remove-stock',
  checkRoles('admin', 'warehouse_manager'),
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  packagingController.removePackagingStock
);

module.exports = router;

