const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const storageBinController = require('../controllers/storageBin');
const { authenticate } = require('../middlewares/auth');
const { checkRoles } = require('../middlewares/role');

// All routes require authentication
router.use(authenticate);

// Get all storage bins
router.get('/', storageBinController.getStorageBins);

// Get storage summary
router.get('/summary', storageBinController.getStorageSummary);

// Find available bins
router.get('/available', storageBinController.findAvailableBins);

// Get single storage bin
router.get('/:id', storageBinController.getStorageBinById);

// Create storage bin (admin, warehouse_manager)
router.post('/', 
  checkRoles('admin', 'warehouse_manager'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type').isIn(['raw', 'finished', 'byproduct']).withMessage('Invalid type'),
    body('capacityKg').isFloat({ min: 0 }).withMessage('Capacity must be a positive number'),
    body('location').optional().trim(),
  ],
  storageBinController.createStorageBin
);

// Update storage bin (admin, warehouse_manager)
router.put('/:id',
  checkRoles('admin', 'warehouse_manager'),
  storageBinController.updateStorageBin
);

// Delete storage bin (admin only)
router.delete('/:id',
  checkRoles('admin'),
  storageBinController.deleteStorageBin
);

module.exports = router;

