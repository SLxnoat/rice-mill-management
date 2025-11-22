const InventoryMovement = require('../models/InventoryMovement');
const { validationResult } = require('express-validator');

// Get all inventory movements
exports.getMovements = async (req, res) => {
  try {
    const { productId, refType, refId, type, startDate, endDate, limit = 100 } = req.query;
    const query = {};
    
    if (productId) query.productId = productId;
    if (refType) query.refType = refType;
    if (refId) query.refId = refId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const movements = await InventoryMovement.find(query)
      .populate('productId', 'sku name')
      .populate('fromBin', 'name location')
      .populate('toBin', 'name location')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      movements,
      count: movements.length
    });
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory movements',
      message: error.message
    });
  }
};

// Get product history
exports.getProductHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate } = req.query;
    
    const history = await InventoryMovement.getProductHistory(
      productId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching product history:', error);
    res.status(500).json({
      error: 'Failed to fetch product history',
      message: error.message
    });
  }
};

// Get stock balance
exports.getStockBalance = async (req, res) => {
  try {
    const { productId } = req.params;
    const { asOfDate } = req.query;
    
    const balance = await InventoryMovement.getStockBalance(
      productId,
      asOfDate ? new Date(asOfDate) : new Date()
    );
    
    res.json({
      success: true,
      productId,
      balance,
      asOfDate: asOfDate || new Date()
    });
  } catch (error) {
    console.error('Error calculating stock balance:', error);
    res.status(500).json({
      error: 'Failed to calculate stock balance',
      message: error.message
    });
  }
};

// Get movements by reference
exports.getMovementsByRef = async (req, res) => {
  try {
    const { refType, refId } = req.params;
    
    const movements = await InventoryMovement.getMovementsByRef(refType, refId);
    
    res.json({
      success: true,
      movements
    });
  } catch (error) {
    console.error('Error fetching movements by reference:', error);
    res.status(500).json({
      error: 'Failed to fetch movements',
      message: error.message
    });
  }
};

// Get movement summary
exports.getMovementSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    const summary = await InventoryMovement.getMovementSummary(start, end);
    
    res.json({
      success: true,
      summary,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error fetching movement summary:', error);
    res.status(500).json({
      error: 'Failed to fetch movement summary',
      message: error.message
    });
  }
};

// Create manual adjustment
exports.createAdjustment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { productId, qtyKg, reason, notes, fromBin, toBin } = req.body;
    
    const movement = new InventoryMovement({
      type: 'ADJUST',
      productId,
      qtyKg,
      fromBin,
      toBin,
      refType: 'adjustment',
      reason: reason || 'Manual adjustment',
      notes,
      createdBy: req.user.id
    });
    
    await movement.save();
    
    await movement.populate('productId', 'sku name');
    await movement.populate('fromBin', 'name');
    await movement.populate('toBin', 'name');
    
    res.status(201).json({
      success: true,
      movement,
      message: 'Inventory adjustment recorded successfully'
    });
  } catch (error) {
    console.error('Error creating adjustment:', error);
    res.status(500).json({
      error: 'Failed to create adjustment',
      message: error.message
    });
  }
};

