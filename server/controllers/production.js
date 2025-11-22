const ProductionBatch = require('../models/ProductionBatch');
const RawMaterials = require('../models/RawMaterials');
const FinishedGoods = require('../models/FinishedGoods');
const InventoryMovement = require('../models/InventoryMovement');
const { getNextBatchNumber } = require('../utils/autoNumbering');
const {
    PRODUCTION_TOLERANCE_PCT,
    DEFAULT_RICE_GRADE,
    DEFAULT_BAG_WEIGHT_KG,
    DEFAULT_EXPIRY_DAYS
} = require('../config/constants');
const mongoose = require('mongoose');

/**
 * Get all production batches
 */
const getBatches = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const query = {};

        if (status) query.status = status;
        if (startDate && endDate) {
            query.$or = [
                { startedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                { startTime: { $gte: new Date(startDate), $lte: new Date(endDate) } }
            ];
        }

        const batches = await ProductionBatch.find(query)
            .populate('rawMaterialId', 'name sku')
            .populate('operatorIds', 'name email')
            .populate('operatorId', 'name email')
            .populate('machineIds', 'name serialNumber type')
            .sort({ createdAt: -1 });

        res.json({ batches });
    } catch (error) {
        console.error('Get batches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get single batch
 */
const getBatchById = async (req, res) => {
    try {
        const batch = await ProductionBatch.findById(req.params.id)
            .populate('rawMaterialId')
            .populate('operatorIds', 'name email')
            .populate('operatorId', 'name email')
            .populate('machineIds', 'name serialNumber');

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        res.json({ batch });
    } catch (error) {
        console.error('Get batch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create new production batch
 */
const createBatch = async (req, res) => {
    // Note: Transactions removed for standalone MongoDB compatibility
    try {
        const {
            paddyType,
            paddyBreakdown,
            inputQuantityKg,
            inputPaddyKg,
            rawMaterialId,
            operatorIds,
            operatorId,
            machineIds,
            storageBinId,
            notes
        } = req.body;

        // 1. Verify Raw Material availability
        const rawMaterial = await RawMaterials.findById(rawMaterialId);
        if (!rawMaterial) {
            return res.status(404).json({ error: 'Raw material not found' });
        }

        const inputQty = inputPaddyKg || inputQuantityKg;
        if (rawMaterial.quantity < inputQty) {
            return res.status(400).json({ error: 'Insufficient raw material quantity' });
        }

        // 2. Generate Batch Number using auto-numbering
        const batchNumber = await getNextBatchNumber();

        // 3. Prepare operator IDs array
        const operators = [];
        if (operatorIds && Array.isArray(operatorIds)) {
            operators.push(...operatorIds);
        }
        if (operatorId && !operators.includes(operatorId)) {
            operators.push(operatorId);
        }
        if (operators.length === 0) {
            operators.push(req.user.id); // Default to current user
        }

        // 4. Create Batch
        const batch = new ProductionBatch({
            batchNumber,
            batchId: batchNumber, // Keep for backward compatibility
            paddyType: paddyType || (paddyBreakdown?.nadu && paddyBreakdown?.samba ? 'mixed' : null),
            paddyBreakdown: paddyBreakdown || (paddyType === 'nadu' ? { nadu: inputQty, samba: 0 } : paddyType === 'samba' ? { nadu: 0, samba: inputQty } : { nadu: 0, samba: 0 }),
            inputQuantityKg: inputQty,
            inputPaddyKg: inputQty,
            rawMaterialId,
            startedAt: new Date(),
            startTime: new Date(),
            status: 'in_progress',
            operatorId: operators[0], // Keep for backward compatibility
            operatorIds: operators,
            machineIds: machineIds || [],
            notes
        });

        await batch.save();

        // 4. Deduct from Raw Materials using atomic operation to prevent race conditions
        const rawMaterialUpdate = await RawMaterials.findOneAndUpdate(
            {
                _id: rawMaterialId,
                quantity: { $gte: inputQty } // Only update if sufficient quantity exists
            },
            {
                $inc: { quantity: -inputQty },
                $set: { status: 'available' } // Will be updated below if quantity becomes 0
            },
            { new: true }
        );

        if (!rawMaterialUpdate) {
            // This means either the material doesn't exist or insufficient quantity
            // Rollback the batch creation
            await ProductionBatch.findByIdAndDelete(batch._id);
            return res.status(400).json({
                error: 'Insufficient raw material quantity or material not found. Batch creation cancelled.'
            });
        }

        // Update status to 'used' if quantity is now 0
        if (rawMaterialUpdate.quantity === 0) {
            rawMaterialUpdate.status = 'used';
            await rawMaterialUpdate.save();
        }

        // 5. Create inventory movement (OUT) for raw material
        try {
            const movement = new InventoryMovement({
                type: 'OUT',
                productId: rawMaterialId, // Assuming RawMaterials can be linked to Product
                qtyKg: inputQty,
                fromBin: storageBinId,
                refType: 'production',
                refId: batch._id,
                reason: 'Production batch started',
                createdBy: req.user.id
            });
            await movement.save();
        } catch (movementError) {
            console.warn('Could not create inventory movement:', movementError.message);
            // Don't fail the batch creation if movement fails
        }

        res.status(201).json({
            batch,
            message: 'Production batch started successfully'
        });

    } catch (error) {
        console.error('Create batch error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

/**
 * Update batch (e.g., add notes, update status)
 */
const updateBatch = async (req, res) => {
    try {
        const batch = await ProductionBatch.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        res.json({
            batch,
            message: 'Batch updated successfully'
        });
    } catch (error) {
        console.error('Update batch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Complete batch and record output
 */
const completeBatch = async (req, res) => {
    try {
        const {
            riceWeightKg,
            brokenRiceKg,
            branKg,
            huskKg,
            notes
        } = req.body;

        const batch = await ProductionBatch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        if (batch.status === 'completed') {
            return res.status(400).json({ error: 'Batch is already completed' });
        }

        // Validate Output Weights
        const outputRice = parseFloat(riceWeightKg || req.body.outputRiceKg || 0);
        const broken = parseFloat(brokenRiceKg || req.body.brokenKg || 0);
        const bran = parseFloat(branKg || 0);
        const husk = parseFloat(huskKg || 0);
        const impurity = parseFloat(req.body.impurityKg || 0);

        const totalOutput = outputRice + broken + bran + husk + impurity;

        // Allow for small margin of error or moisture gain (unlikely but safe), but generally warn if > input
        // For now, strict check: cannot exceed input by more than tolerance %
        if (totalOutput > batch.inputQuantityKg * (1 + PRODUCTION_TOLERANCE_PCT)) {
            return res.status(400).json({
                error: `Total output (${totalOutput.toFixed(2)}kg) exceeds input (${batch.inputQuantityKg}kg) by more than ${PRODUCTION_TOLERANCE_PCT * 100}%`
            });
        }

        batch.output = {
            riceWeightKg: outputRice,
            outputRiceKg: outputRice,
            brokenRiceKg: broken,
            brokenKg: broken,
            branKg: bran,
            huskKg: husk,
            impurityKg: req.body.impurityKg || 0
        };
        batch.endedAt = new Date();
        batch.endTime = new Date();
        batch.status = 'completed';
        if (notes) batch.notes = notes;

        await batch.save();

        // 2. Create Finished Goods (Rice)
        // Determine grade based on broken percentage or manual input (simplified here)
        const riceGrade = req.body.riceGrade || DEFAULT_RICE_GRADE;

        // Create finished goods for rice output
        const finishedGoods = new FinishedGoods({
            sku: `FG-${batch.batchNumber || batch.batchId}`,
            batchId: batch._id,
            paddyType: batch.paddyType,
            riceGrade: riceGrade,
            weightKg: outputRice,
            bagCount: req.body.bagCount || Math.floor(outputRice / DEFAULT_BAG_WEIGHT_KG),
            bagWeightKg: req.body.bagWeightKg || DEFAULT_BAG_WEIGHT_KG,
            packedAt: new Date(),
            expiryDate: req.body.expiryDate || new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            status: 'in_stock',
            pricePerKg: req.body.pricePerKg || 0,
            storageBinId: req.body.storageBinId
        });

        await finishedGoods.save();

        // Create inventory movements for outputs
        try {
            // Rice output (IN)
            if (outputRice > 0) {
                await InventoryMovement.create({
                    type: 'IN',
                    productId: null, // Will need Product model integration
                    qtyKg: outputRice,
                    toBin: req.body.storageBinId,
                    refType: 'production',
                    refId: batch._id,
                    reason: 'Production output - Rice',
                    createdBy: req.user.id
                });
            }
            // Byproducts can also be tracked if needed
        } catch (movementError) {
            console.warn('Could not create inventory movements:', movementError.message);
        }

        // Trigger notification for production completed
        try {
            const { NotificationTriggers } = require('../utils/notifications');
            const batchNumber = batch.batchNumber || batch.batchId || 'N/A';
            const yieldAmount = outputRice;
            await NotificationTriggers.productionCompleted(batchNumber, yieldAmount);
        } catch (notifError) {
            console.warn('Could not send production notification:', notifError.message);
        }

        res.json({
            batch,
            finishedGoods,
            message: 'Batch completed and inventory updated successfully'
        });

    } catch (error) {
        console.error('Complete batch error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

module.exports = {
    getBatches,
    getBatchById,
    createBatch,
    updateBatch,
    completeBatch
};
