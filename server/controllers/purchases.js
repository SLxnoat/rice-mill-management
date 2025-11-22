const Purchase = require('../models/Purchase');
const RawMaterials = require('../models/RawMaterials');
const InventoryMovement = require('../models/InventoryMovement');
const { getNextPONumber } = require('../utils/autoNumbering');
const mongoose = require('mongoose');

/**
 * Get all purchase orders
 */
const getPurchases = async (req, res) => {
    try {
        const { status, supplierId, startDate, endDate } = req.query;
        const query = {};

        if (status) query.status = status;
        if (supplierId) query.supplierId = supplierId;
        if (startDate && endDate) {
            query.receivedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const purchases = await Purchase.find(query)
            .populate('supplierId', 'name')
            .populate('createdBy', 'name')
            .sort({ receivedAt: -1 });

        res.json({ purchases });
    } catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get single purchase order
 */
const getPurchaseById = async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id)
            .populate('supplierId')
            .populate('createdBy', 'name');

        if (!purchase) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json({ purchase });
    } catch (error) {
        console.error('Get purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create new purchase order
 */
const createPurchase = async (req, res) => {
    try {
        const {
            supplierId,
            paddyType,
            grossWeightKg,
            tareKg,
            moisturePercent,
            qualityGrade,
            pricePerKg,
            transportCost,
            unloadingCost,
            storageBinId,
            receivedAt,
            notes
        } = req.body;

        // Calculate derived fields
        const netWeightKg = grossWeightKg - (tareKg || 0);
        const paddyCost = pricePerKg * netWeightKg;
        const totalAmount = paddyCost + (transportCost || 0) + (unloadingCost || 0);

        // Generate PO Number using auto-numbering
        const poNumber = await getNextPONumber();

        const purchase = new Purchase({
            supplierId,
            poNumber,
            paddyType,
            grossWeightKg,
            tareKg: tareKg || 0,
            netWeightKg,
            moisturePercent,
            qualityGrade,
            pricePerKg,
            transportCost: transportCost || 0,
            unloadingCost: unloadingCost || 0,
            totalAmount,
            storageBinId,
            receivedAt: receivedAt || new Date(),
            notes,
            createdBy: req.user.id,
            status: 'received' // Auto-receive for now as per typical workflow
        });

        await purchase.save();

        // Auto-update inventory (RawMaterials)
        const rawMaterial = new RawMaterials({
            sku: `RM-${poNumber}`, // Unique SKU based on PO
            name: `${paddyType} Paddy - ${qualityGrade}`,
            category: 'Paddy',
            quantity: purchase.netWeightKg,
            unit: 'kg',
            minimumStock: 1000, // Default alert level
            supplier: purchase.supplierId.toString(),
            purchaseOrder: purchase._id,
            batchNumber: poNumber,
            receivedDate: purchase.receivedAt,
            costPerUnit: purchase.pricePerKg,
            storageLocation: 'Main Warehouse', // Default
            status: 'available'
        });

        await rawMaterial.save();

        // Create inventory movement (IN)
        try {
            await InventoryMovement.create({
                type: 'IN',
                productId: null, // Will need Product model integration
                qtyKg: purchase.netWeightKg,
                toBin: storageBinId,
                refType: 'purchase',
                refId: purchase._id,
                reason: 'Paddy purchase received',
                unitCost: purchase.pricePerKg,
                createdBy: req.user.id
            });
        } catch (movementError) {
            console.warn('Could not create inventory movement:', movementError.message);
        }

        // Trigger notification for purchase received
        try {
            const { NotificationTriggers } = require('../utils/notifications');
            const Supplier = require('../models/Supplier');
            const supplier = await Supplier.findById(supplierId);
            const supplierName = supplier ? supplier.name : 'Unknown Supplier';
            await NotificationTriggers.purchaseReceived(poNumber, supplierName);
        } catch (notifError) {
            console.warn('Could not send purchase notification:', notifError.message);
        }

        res.status(201).json({
            purchase,
            rawMaterial,
            message: 'Purchase order created and inventory updated successfully'
        });

    } catch (error) {
        console.error('Create purchase error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

/**
 * Update purchase status
 */
const updatePurchaseStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const purchase = await Purchase.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!purchase) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json({
            purchase,
            message: 'Purchase status updated successfully'
        });
    } catch (error) {
        console.error('Update purchase status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get purchase summary statistics
 */
const getPurchaseSummary = async (req, res) => {
    try {
        // Get all purchases
        const allPurchases = await Purchase.find({ status: { $ne: 'cancelled' } });

        // Get current month purchases
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthPurchases = await Purchase.find({
            status: { $ne: 'cancelled' },
            createdAt: { $gte: firstDayOfMonth }
        });

        // Get pending purchases (draft or confirmed)
        const pendingPurchases = await Purchase.find({
            status: { $in: ['draft', 'confirmed'] }
        });

        // Get unique suppliers count
        const Supplier = require('../models/Supplier');
        const activeSuppliers = await Supplier.countDocuments({ status: 'active' });

        // Calculate totals
        const totalAmount = allPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const monthAmount = monthPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const totalWeight = allPurchases.reduce((sum, p) => sum + (p.netWeightKg || 0), 0);
        const pendingAmount = pendingPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

        res.json({
            summary: {
                totalPurchases: allPurchases.length,
                totalAmount,
                totalWeight,
                monthPurchases: monthPurchases.length,
                monthAmount,
                pendingOrders: pendingPurchases.length,
                pendingAmount,
                activeSuppliers
            }
        });
    } catch (error) {
        console.error('Get purchase summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update purchase order
 */
const updatePurchase = async (req, res) => {
    try {
        const {
            supplierId,
            paddyType,
            grossWeightKg,
            tareKg,
            moisturePercent,
            qualityGrade,
            pricePerKg,
            transportCost,
            unloadingCost,
            storageBinId,
            receivedAt,
            notes,
            status
        } = req.body;

        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        // Calculate derived fields
        const netWeightKg = grossWeightKg - (tareKg || 0);
        const paddyCost = pricePerKg * netWeightKg;
        const totalAmount = paddyCost + (transportCost || 0) + (unloadingCost || 0);

        // Update fields
        purchase.supplierId = supplierId || purchase.supplierId;
        purchase.paddyType = paddyType || purchase.paddyType;
        purchase.grossWeightKg = grossWeightKg;
        purchase.tareKg = tareKg || 0;
        purchase.netWeightKg = netWeightKg;
        purchase.moisturePercent = moisturePercent;
        purchase.qualityGrade = qualityGrade || purchase.qualityGrade;
        purchase.pricePerKg = pricePerKg;
        purchase.transportCost = transportCost || 0;
        purchase.unloadingCost = unloadingCost || 0;
        purchase.totalAmount = totalAmount;
        purchase.storageBinId = storageBinId || purchase.storageBinId;
        purchase.receivedAt = receivedAt || purchase.receivedAt;
        purchase.notes = notes || purchase.notes;
        if (status) purchase.status = status;

        await purchase.save();

        // If status is received, update related inventory
        if (purchase.status === 'received') {
            // Update RawMaterial
            const RawMaterials = require('../models/RawMaterials');
            await RawMaterials.findOneAndUpdate(
                { purchaseOrder: purchase._id },
                {
                    name: `${purchase.paddyType} Paddy - ${purchase.qualityGrade}`,
                    quantity: purchase.netWeightKg,
                    costPerUnit: purchase.pricePerKg,
                    supplier: purchase.supplierId,
                    receivedDate: purchase.receivedAt
                }
            );

            // Update InventoryMovement
            const InventoryMovement = require('../models/InventoryMovement');
            await InventoryMovement.findOneAndUpdate(
                { refId: purchase._id, refType: 'purchase' },
                {
                    qtyKg: purchase.netWeightKg,
                    unitCost: purchase.pricePerKg,
                    toBin: purchase.storageBinId
                }
            );
        }

        res.json({
            purchase,
            message: 'Purchase order updated successfully'
        });
    } catch (error) {
        console.error('Update purchase error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

module.exports = {
    getPurchases,
    getPurchaseById,
    createPurchase,
    updatePurchase,
    updatePurchaseStatus,
    getPurchaseSummary
};
