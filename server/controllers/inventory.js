const RawMaterials = require('../models/RawMaterials');
const FinishedGoods = require('../models/FinishedGoods');
const ProductionBatch = require('../models/ProductionBatch');
const { validationResult } = require('express-validator');
const { LOW_STOCK_THRESHOLD_KG } = require('../config/constants');

// Get all raw materials
exports.getRawMaterials = async (req, res) => {
  try {
    const rawMaterials = await RawMaterials.find({ status: 'available' })
      .populate('purchaseOrder')
      .populate('verifiedBy', 'username')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      materials: rawMaterials
    });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({
      error: 'Failed to fetch raw materials',
      message: error.message
    });
  }
};

// Get all finished goods
exports.getFinishedGoods = async (req, res) => {
  try {
    const finishedGoods = await FinishedGoods.find({})
      .populate('batchId', 'batchNumber paddyType startDate')
      .populate('storageBinId', 'binNumber')
      .populate('verifiedBy', 'username')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      goods: finishedGoods
    });
  } catch (error) {
    console.error('Error fetching finished goods:', error);
    res.status(500).json({
      error: 'Failed to fetch finished goods',
      message: error.message
    });
  }
};

// Create raw material
exports.createRawMaterial = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const rawMaterialData = {
      sku: req.body.sku || `RM${Date.now()}`,
      name: req.body.name,
      category: req.body.category,
      quantity: req.body.quantity,
      unit: req.body.unit,
      minimumStock: req.body.minimumStock || 0,
      supplier: req.body.supplier,
      purchaseOrder: req.body.purchaseOrder,
      batchNumber: req.body.batchNumber,
      costPerUnit: req.body.costPerUnit,
      expiryDate: req.body.expiryDate,
      storageLocation: req.body.storageLocation,
      notes: req.body.notes
    };

    const rawMaterial = new RawMaterials(rawMaterialData);
    await rawMaterial.save();

    await rawMaterial.populate('purchaseOrder');
    await rawMaterial.populate('verifiedBy', 'username');

    res.status(201).json({
      success: true,
      material: rawMaterial
    });
  } catch (error) {
    console.error('Error creating raw material:', error);
    if (error.code === 11000) {
      res.status(400).json({
        error: 'Duplicate SKU',
        message: 'A raw material with this SKU already exists'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create raw material',
        message: error.message
      });
    }
  }
};

// Create finished good
exports.createFinishedGood = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Verify batch exists
    const batch = await ProductionBatch.findById(req.body.batchId);
    if (!batch) {
      return res.status(400).json({
        error: 'Invalid batch',
        message: 'Production batch not found'
      });
    }

    const finishedGoodData = {
      sku: req.body.sku || `FG${Date.now()}`,
      batchId: req.body.batchId,
      paddyType: req.body.paddyType,
      riceGrade: req.body.riceGrade,
      weightKg: req.body.weightKg,
      bagCount: req.body.bagCount,
      bagWeightKg: req.body.bagWeightKg,
      barcode: req.body.barcode,
      qrCode: req.body.qrCode,
      packedAt: req.body.packedAt || new Date(),
      storageBinId: req.body.storageBinId,
      locationNotes: req.body.locationNotes,
      expiryDate: req.body.expiryDate,
      notes: req.body.notes,
      pricePerKg: req.body.pricePerKg
    };

    const finishedGood = new FinishedGoods(finishedGoodData);
    await finishedGood.save();

    await finishedGood.populate('batchId', 'batchNumber paddyType startDate');
    await finishedGood.populate('storageBinId', 'binNumber');
    await finishedGood.populate('verifiedBy', 'username');

    res.status(201).json({
      success: true,
      good: finishedGood
    });
  } catch (error) {
    console.error('Error creating finished good:', error);
    if (error.code === 11000) {
      res.status(400).json({
        error: 'Duplicate SKU or barcode',
        message: 'A finished good with this SKU or barcode already exists'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create finished good',
        message: error.message
      });
    }
  }
};

// Update raw material
exports.updateRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rawMaterial = await RawMaterials.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('purchaseOrder')
      .populate('verifiedBy', 'username');

    if (!rawMaterial) {
      return res.status(404).json({
        error: 'Raw material not found'
      });
    }

    res.json({
      success: true,
      material: rawMaterial
    });
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({
      error: 'Failed to update raw material',
      message: error.message
    });
  }
};

// Update finished good
exports.updateFinishedGood = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const finishedGood = await FinishedGoods.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('batchId', 'batchNumber paddyType startDate')
      .populate('storageBinId', 'binNumber')
      .populate('verifiedBy', 'username');

    if (!finishedGood) {
      return res.status(404).json({
        error: 'Finished good not found'
      });
    }

    res.json({
      success: true,
      good: finishedGood
    });
  } catch (error) {
    console.error('Error updating finished good:', error);
    res.status(500).json({
      error: 'Failed to update finished good',
      message: error.message
    });
  }
};

// Delete raw material
exports.deleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const rawMaterial = await RawMaterials.findByIdAndDelete(id);

    if (!rawMaterial) {
      return res.status(404).json({
        error: 'Raw material not found'
      });
    }

    res.json({
      success: true,
      message: 'Raw material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    res.status(500).json({
      error: 'Failed to delete raw material',
      message: error.message
    });
  }
};

// Delete finished good
exports.deleteFinishedGood = async (req, res) => {
  try {
    const { id } = req.params;

    const finishedGood = await FinishedGoods.findByIdAndDelete(id);

    if (!finishedGood) {
      return res.status(404).json({
        error: 'Finished good not found'
      });
    }

    res.json({
      success: true,
      message: 'Finished good deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting finished good:', error);
    res.status(500).json({
      error: 'Failed to delete finished good',
      message: error.message
    });
  }
};

// Adjust stock quantity for raw material
exports.adjustRawMaterialStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    const rawMaterial = await RawMaterials.findById(id);
    if (!rawMaterial) {
      return res.status(404).json({
        error: 'Raw material not found'
      });
    }

    const newQuantity = Math.max(0, rawMaterial.quantity + adjustment);
    const oldQuantity = rawMaterial.quantity;

    rawMaterial.quantity = newQuantity;
    rawMaterial.notes = `${rawMaterial.notes || ''}\nStock adjusted from ${oldQuantity} to ${newQuantity}. Reason: ${reason || 'Not specified'}`.trim();

    await rawMaterial.save();
    await rawMaterial.populate('purchaseOrder');
    await rawMaterial.populate('verifiedBy', 'username');

    // Check for low stock and trigger notification
    if (rawMaterial.minimumStock && newQuantity <= rawMaterial.minimumStock) {
      try {
        const { NotificationTriggers } = require('../utils/notifications');
        await NotificationTriggers.lowStockAlert(
          rawMaterial.name,
          newQuantity,
          rawMaterial.minimumStock
        );
      } catch (notifError) {
        console.warn('Could not send low stock notification:', notifError.message);
      }
    }

    res.json({
      success: true,
      material: rawMaterial,
      oldQuantity,
      newQuantity
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      error: 'Failed to adjust stock',
      message: error.message
    });
  }
};

// Adjust stock quantity for finished good
exports.adjustFinishedGoodStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    const finishedGood = await FinishedGoods.findById(id);
    if (!finishedGood) {
      return res.status(404).json({
        error: 'Finished good not found'
      });
    }

    const newWeight = Math.max(0, finishedGood.weightKg + adjustment);
    const oldWeight = finishedGood.weightKg;

    finishedGood.weightKg = newWeight;
    finishedGood.notes = `${finishedGood.notes || ''}\nWeight adjusted from ${oldWeight}kg to ${newWeight}kg. Reason: ${reason || 'Not specified'}`.trim();

    await finishedGood.save();
    await finishedGood.populate('batchId', 'batchNumber paddyType startDate');
    await finishedGood.populate('storageBinId', 'binNumber');
    await finishedGood.populate('verifiedBy', 'username');

    // Check for low stock (using centralized threshold)
    if (newWeight <= LOW_STOCK_THRESHOLD_KG) {
      try {
        const { NotificationTriggers } = require('../utils/notifications');
        await NotificationTriggers.lowStockAlert(
          `${finishedGood.paddyType} ${finishedGood.riceGrade} Rice`,
          newWeight,
          LOW_STOCK_THRESHOLD_KG
        );
      } catch (notifError) {
        console.warn('Could not send low stock notification:', notifError.message);
      }
    }

    res.json({
      success: true,
      good: finishedGood,
      oldWeight,
      newWeight
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      error: 'Failed to adjust stock',
      message: error.message
    });
  }
};

// Get inventory summary
exports.getInventorySummary = async (req, res) => {
  try {
    const rawSummary = await RawMaterials.getInventorySummary();
    const finishedSummary = await FinishedGoods.getInventorySummary();

    res.json({
      success: true,
      summary: {
        rawMaterials: rawSummary,
        finishedGoods: finishedSummary
      }
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory summary',
      message: error.message
    });
  }
};

// Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const lowStockRaw = await RawMaterials.getLowStockAlerts();
    const lowStockFinished = await FinishedGoods.findExpiringSoon(30); // Expiring soon as proxy for low stock

    res.json({
      success: true,
      alerts: {
        rawMaterials: lowStockRaw,
        finishedGoods: lowStockFinished
      }
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({
      error: 'Failed to fetch low stock alerts',
      message: error.message
    });
  }
};
