const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkRoles } = require('../middlewares/role');
const {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require('../controllers/suppliers');

// All routes require authentication
router.use(authenticate);

// Get all suppliers (Accessible by most roles)
router.get('/', getSuppliers);

// Get single supplier
router.get('/:id', getSuppliers);

// Create supplier (Admin, Accountant, Sales Manager)
router.post('/', checkRoles('admin', 'accountant', 'sales_manager'), createSupplier);

// Update supplier (Admin, Accountant, Sales Manager)
router.put('/:id', checkRoles('admin', 'accountant', 'sales_manager'), updateSupplier);

// Delete supplier (Admin only)
router.delete('/:id', checkRoles('admin'), deleteSupplier);

module.exports = router;
