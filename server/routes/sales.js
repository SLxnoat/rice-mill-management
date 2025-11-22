const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { requireSales, requireInvoiceCreate, requireRead, canView } = require('../middlewares/role');
const { body } = require('express-validator');
const salesController = require('../controllers/sales');

// All routes require authentication
router.use(authenticate);

// --- Sales Orders Routes ---
// View orders: admin, sales_manager, accountant (read-only)
router.get('/orders', canView('sales'), salesController.getOrders);
router.get('/orders/:id', canView('sales'), salesController.getOrderById);

// Create/update orders: admin, sales_manager
router.post('/orders', requireSales, [
    body('customerName').trim().notEmpty().withMessage('Customer Name is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.sku').notEmpty().withMessage('Product SKU is required'),
    body('items.*.qtyKg').isFloat({ min: 0.1 }).withMessage('Quantity must be positive'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit Price must be positive'),
    body('deliveryDate').isISO8601().withMessage('Valid Delivery Date is required'),
], salesController.createOrder);

router.patch('/orders/:id/status', requireSales, [
    body('status').isIn(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'invoiced']).withMessage('Invalid status'),
], salesController.updateOrderStatus);

// --- Invoices Routes ---
// View invoices: admin, sales_manager, accountant (read-only)
router.get('/invoices', canView('invoices'), salesController.getInvoices);

// Create invoices: admin, sales_manager, accountant
router.post('/invoices', requireInvoiceCreate, [
    body('orderId').isMongoId().withMessage('Valid Order ID is required'),
], salesController.createInvoice);

// --- Delivery Routes ---
const { requireDriver } = require('../middlewares/role');

// View assigned deliveries: admin, driver (drivers see only their deliveries)
router.get('/deliveries', requireRead, (req, res, next) => {
  // If driver, only show their deliveries
  if (req.user.role === 'driver') {
    req.query.driverId = req.user.id;
  }
  next();
}, salesController.getOrders); // Reuse getOrders with driver filter

// Mark delivery as delivered: admin, driver
router.patch('/deliveries/:id/delivered', requireDriver, [
    body('deliveredAt').optional().isISO8601().withMessage('Valid delivery date is required'),
], async (req, res) => {
  const { id } = req.params;
  const { deliveredAt } = req.body;
  
  try {
    const SalesOrder = require('../models/SalesOrder');
    const order = await SalesOrder.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Driver can only mark their own deliveries
    if (req.user.role === 'driver' && order.driverId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only mark your own deliveries' });
    }
    
    order.deliveredAt = deliveredAt || new Date();
    order.status = 'delivered';
    await order.save();
    
    // Trigger notification for delivery completed
    try {
      const { NotificationTriggers } = require('../utils/notifications');
      const driver = await User.findById(order.driverId);
      const driverName = driver ? driver.name : 'Driver';
      await NotificationTriggers.deliveryDispatched(order.orderNumber, driverName);
    } catch (notifError) {
      console.warn('Could not send delivery completion notification:', notifError.message);
    }
    
    res.json({ message: 'Delivery marked as delivered', order });
  } catch (error) {
    console.error('Mark delivery error:', error);
    res.status(500).json({ error: 'Failed to mark delivery' });
  }
});

module.exports = router;
