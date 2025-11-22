const express = require('express');
const router = express.Router();
const {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerStats,
    getOutstandingCustomers
} = require('../controllers/customer');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin, requireCustomerManagement, requireRead } = require('../middlewares/role');

// Protect all routes
router.use(authenticate);

// Statistics and outstanding: all authenticated users (read-only)
router.get('/stats', requireRead, getCustomerStats);
router.get('/outstanding', requireRead, getOutstandingCustomers);

// View customers: all authenticated users (read-only)
router.route('/')
    .get(requireRead, getCustomers)
    .post(requireCustomerManagement, createCustomer); // admin, sales_manager

router.route('/:id')
    .get(requireRead, getCustomer)
    .put(requireCustomerManagement, updateCustomer) // admin, sales_manager
    .delete(requireAdmin, deleteCustomer); // admin only

module.exports = router;
