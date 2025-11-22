const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const FinishedGoods = require('../models/FinishedGoods');
const InventoryMovement = require('../models/InventoryMovement');
const User = require('../models/User');
const MillSettings = require('../models/MillSettings');
const { validationResult } = require('express-validator');

// Get all sales orders
exports.getOrders = async (req, res) => {
    try {
        const orders = await SalesOrder.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email')
            .populate('invoiceId');
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await SalesOrder.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('invoiceId');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
};

// Create new sales order
exports.createOrder = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            customerName,
            customerAddress,
            customerPhone,
            customerId,
            items,
            deliveryDate,
            shippingAddress,
            paymentTerms,
            deliveryMethod,
            driverId,
            notes
        } = req.body;

        // Generate order number using auto-numbering
        const { getNextSalesOrderNumber } = require('../utils/autoNumbering');
        const orderNumber = await getNextSalesOrderNumber();

        // Validate stock and enrich items
        for (const item of items) {
            const product = await FinishedGoods.findOne({ sku: item.sku });
            if (!product) {
                return res.status(400).json({ error: `Product not found: ${item.sku}` });
            }
            if (product.weightKg < item.qtyKg) {
                return res.status(400).json({
                    error: `Insufficient stock for ${item.sku}. Available: ${product.weightKg}kg`
                });
            }

            item.productName = `${product.paddyType} Rice - ${product.riceGrade}`;
            item.totalPrice = item.qtyKg * item.unitPrice;
        }

        const order = new SalesOrder({
            orderNumber,
            customerId,
            customerName,
            customerAddress,
            customerPhone,
            items,
            deliveryDate,
            shippingAddress,
            paymentTerms,
            deliveryMethod,
            driverId,
            notes,
            createdBy: req.user.id,
            status: 'draft'
        });

        await order.save();

        // Trigger notification for new order
        try {
            const { NotificationTriggers } = require('../utils/notifications');
            await NotificationTriggers.newOrder(order.orderNumber, order.customerName);
        } catch (notifError) {
            console.warn('Could not send notification for new order:', notifError.message);
        }

        res.status(201).json({
            success: true,
            order,
            message: 'Sales Order created successfully'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order: ' + error.message
        });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await SalesOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Status transition logic
        if (status === 'confirmed' && order.status === 'draft') {
            order.status = 'confirmed';
        } else if (status === 'shipped' && (order.status === 'confirmed' || order.status === 'invoiced')) {
            // Note: Stock is reduced during invoice generation, not during shipping
            order.status = 'shipped';
        } else if (status === 'delivered' && order.status === 'shipped') {
            order.status = 'delivered';
        } else if (status === 'cancelled') {
            if (order.status === 'shipped' || order.status === 'delivered') {
                return res.status(400).json({
                    error: 'Cannot cancel shipped or delivered orders'
                });
            }
            order.status = 'cancelled';
        } else {
            order.status = status;
        }

        await order.save();
        res.json({
            success: true,
            order,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
};

// Get all invoices
exports.getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find()
            .sort({ createdAt: -1 })
            .populate('orderId', 'orderNumber customerName')
            .populate('billedBy', 'name email');
        res.json({ invoices });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
};

// Create invoice with auto-generation and stock updates
exports.createInvoice = async (req, res) => {
    try {
        const { orderId, discountPercent = 0, taxPercent, notes = '' } = req.body;

        // 1. Get the sales order
        const order = await SalesOrder.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.invoiceId) {
            return res.status(400).json({ error: 'Order already has an invoice' });
        }
        if (order.status !== 'confirmed') {
            return res.status(400).json({ error: 'Only confirmed orders can be invoiced' });
        }

        // 2. Get mill settings for company details
        const millSettings = await MillSettings.getSettings();

        // 3. Generate invoice number using auto-numbering
        const { getNextInvoiceNumber } = require('../utils/autoNumbering');
        const invoiceNumber = await getNextInvoiceNumber();
        const now = new Date();

        // 4. Get current time in HH:MM:SS format
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const invoiceTime = `${hours}:${minutes}:${seconds}`;

        // 5. Get user details
        const user = await User.findById(req.user.id);
        const preparedByName = user ? user.name : 'Unknown User';

        // 6. Calculate totals
        const subtotal = order.totalAmount;
        const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
        const taxableAmount = subtotal - discountAmount;
        const actualTaxPercent = taxPercent !== undefined ? taxPercent : (millSettings.taxSettings?.gstRate || 0);
        const taxAmount = Math.round(taxableAmount * (actualTaxPercent / 100) * 100) / 100;
        const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

        // 7. Prepare mill details
        const addressParts = [];
        if (millSettings.address?.street) addressParts.push(millSettings.address.street);
        if (millSettings.address?.city) addressParts.push(millSettings.address.city);
        if (millSettings.address?.state) addressParts.push(millSettings.address.state);
        if (millSettings.address?.pincode) addressParts.push(millSettings.address.pincode);

        const millDetails = {
            name: millSettings.millName || 'KMG Rice Mill',
            address: addressParts.join(', ') || 'Not specified',
            phone: millSettings.contact?.phone || millSettings.contact?.mobile || 'Not specified',
            email: millSettings.contact?.email || 'Not specified',
            gst: millSettings.gst?.number || 'Not specified'
        };

        // 8. Create the invoice
        const invoice = new Invoice({
            invoiceNumber,
            orderId: order._id,
            customerName: order.customerName,
            customerAddress: order.customerAddress,
            customerPhone: order.customerPhone,
            items: order.items,
            subtotal,
            discountPercent,
            discountAmount,
            taxPercent: actualTaxPercent,
            taxAmount,
            totalAmount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            invoiceDate: now,
            invoiceTime,
            billedBy: req.user.id,
            driverId: order.driverId || req.body.driverId,
            preparedByName,
            millDetails,
            paymentTerms: order.paymentTerms || 'cash',
            notes
        });

        await invoice.save();

        // 9. Update stock for each item in the invoice and create inventory movements
        const stockUpdates = [];
        for (const item of order.items) {
            try {
                const product = await FinishedGoods.findOne({ sku: item.sku });
                if (product) {
                    const oldStock = product.weightKg;
                    product.weightKg = Math.max(0, product.weightKg - item.qtyKg);
                    product.updatedAt = new Date();
                    await product.save();

                    stockUpdates.push({
                        sku: item.sku,
                        productName: item.productName,
                        oldStock,
                        newStock: product.weightKg,
                        reduced: item.qtyKg
                    });

                    // Create inventory movement (OUT)
                    try {
                        await InventoryMovement.create({
                            type: 'OUT',
                            productId: null, // Will need Product model integration
                            qtyKg: item.qtyKg,
                            fromBin: product.storageBinId,
                            refType: 'sale',
                            refId: invoice._id,
                            reason: 'Sale - Invoice generated',
                            unitCost: item.unitPrice,
                            createdBy: req.user.id
                        });
                    } catch (movementError) {
                        console.warn('Could not create inventory movement:', movementError.message);
                    }

                    // Check for low stock after sale
                    const minThreshold = 50; // Default minimum stock for finished goods
                    if (product.weightKg <= minThreshold) {
                        try {
                            const { NotificationTriggers } = require('../utils/notifications');
                            await NotificationTriggers.lowStockAlert(
                                `${product.paddyType} ${product.riceGrade} Rice`,
                                product.weightKg,
                                minThreshold
                            );
                        } catch (notifError) {
                            console.warn('Could not send low stock notification:', notifError.message);
                        }
                    }

                    console.log(`✅ Stock updated for ${item.sku}: ${oldStock}kg → ${product.weightKg}kg (reduced ${item.qtyKg}kg)`);
                } else {
                    console.warn(`⚠️ Product not found for SKU: ${item.sku}`);
                }
            } catch (stockError) {
                console.error(`❌ Error updating stock for ${item.sku}:`, stockError);
                // Continue with other items even if one fails
            }
        }

        // 10. Update order status and link invoice
        order.invoiceId = invoice._id;
        order.status = 'invoiced';
        await order.save();

        // 11. Trigger notification for invoice generated
        try {
            const { NotificationTriggers } = require('../utils/notifications');
            await NotificationTriggers.invoiceGenerated(invoiceNumber, order.customerName, invoice.totalAmount);
        } catch (notifError) {
            console.warn('Could not send notification for invoice:', notifError.message);
        }

        // 12. Trigger notification for delivery dispatch if driver assigned
        if (order.driverId) {
            try {
                const driver = await User.findById(order.driverId);
                if (driver) {
                    const { NotificationTriggers } = require('../utils/notifications');
                    await NotificationTriggers.deliveryDispatched(order.orderNumber, driver.name, order.driverId);
                }
            } catch (notifError) {
                console.warn('Could not send delivery notification:', notifError.message);
            }
        }

        // 13. Populate the invoice with user details before sending
        await invoice.populate('billedBy', 'name email');

        res.status(201).json({
            success: true,
            invoice,
            stockUpdates,
            message: `Invoice ${invoiceNumber} generated successfully. Stock updated for ${stockUpdates.length} items.`
        });

    } catch (error) {
        console.error('❌ Error creating invoice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create invoice: ' + error.message
        });
    }
};
