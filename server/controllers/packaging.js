const Packaging = require('../models/Packaging');
const { validationResult } = require('express-validator');

// Get all packaging
exports.getPackaging = async (req, res) => {
  try {
    const { type, material, active } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (material) query.material = material;
    if (active !== undefined) query.active = active === 'true';
    
    const packaging = await Packaging.find(query).sort({ type: 1, name: 1 });
    
    res.json({
      success: true,
      packaging
    });
  } catch (error) {
    console.error('Error fetching packaging:', error);
    res.status(500).json({
      error: 'Failed to fetch packaging',
      message: error.message
    });
  }
};

// Get single packaging
exports.getPackagingById = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    
    if (!packaging) {
      return res.status(404).json({
        error: 'Packaging not found'
      });
    }
    
    res.json({
      success: true,
      packaging
    });
  } catch (error) {
    console.error('Error fetching packaging:', error);
    res.status(500).json({
      error: 'Failed to fetch packaging',
      message: error.message
    });
  }
};

// Create packaging
exports.createPackaging = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const packaging = new Packaging(req.body);
    await packaging.save();
    
    res.status(201).json({
      success: true,
      packaging,
      message: 'Packaging created successfully'
    });
  } catch (error) {
    console.error('Error creating packaging:', error);
    res.status(500).json({
      error: 'Failed to create packaging',
      message: error.message
    });
  }
};

// Update packaging
exports.updatePackaging = async (req, res) => {
  try {
    const packaging = await Packaging.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!packaging) {
      return res.status(404).json({
        error: 'Packaging not found'
      });
    }
    
    res.json({
      success: true,
      packaging,
      message: 'Packaging updated successfully'
    });
  } catch (error) {
    console.error('Error updating packaging:', error);
    res.status(500).json({
      error: 'Failed to update packaging',
      message: error.message
    });
  }
};

// Delete packaging
exports.deletePackaging = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    
    if (!packaging) {
      return res.status(404).json({
        error: 'Packaging not found'
      });
    }
    
    // Soft delete
    packaging.active = false;
    await packaging.save();
    
    res.json({
      success: true,
      message: 'Packaging deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting packaging:', error);
    res.status(500).json({
      error: 'Failed to delete packaging',
      message: error.message
    });
  }
};

// Get packaging by type
exports.getPackagingByType = async (req, res) => {
  try {
    const { type } = req.params;
    const packaging = await Packaging.findByType(type);
    
    res.json({
      success: true,
      packaging
    });
  } catch (error) {
    console.error('Error fetching packaging by type:', error);
    res.status(500).json({
      error: 'Failed to fetch packaging',
      message: error.message
    });
  }
};

// Get low stock packaging
exports.getLowStockPackaging = async (req, res) => {
  try {
    const packaging = await Packaging.findLowStock();
    
    res.json({
      success: true,
      packaging
    });
  } catch (error) {
    console.error('Error fetching low stock packaging:', error);
    res.status(500).json({
      error: 'Failed to fetch low stock packaging',
      message: error.message
    });
  }
};

// Get packaging stock summary
exports.getPackagingSummary = async (req, res) => {
  try {
    const summary = await Packaging.getStockSummary();
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching packaging summary:', error);
    res.status(500).json({
      error: 'Failed to fetch packaging summary',
      message: error.message
    });
  }
};

// Add packaging stock
exports.addPackagingStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const packaging = await Packaging.findById(req.params.id);
    
    if (!packaging) {
      return res.status(404).json({
        error: 'Packaging not found'
      });
    }
    
    await packaging.addStock(quantity);
    
    // Refresh packaging to get updated stock
    await packaging.populate('_id');
    const updatedPackaging = await Packaging.findById(req.params.id);
    
    // Check for low stock after update
    if (updatedPackaging.reorderLevel && updatedPackaging.stock <= updatedPackaging.reorderLevel) {
      try {
        const { NotificationTriggers } = require('../utils/notifications');
        await NotificationTriggers.lowPackagingStock(
          updatedPackaging.name || updatedPackaging.type,
          updatedPackaging.stock,
          updatedPackaging.reorderLevel
        );
      } catch (notifError) {
        console.warn('Could not send low packaging stock notification:', notifError.message);
      }
    }
    
    res.json({
      success: true,
      packaging: updatedPackaging,
      message: 'Packaging stock added successfully'
    });
  } catch (error) {
    console.error('Error adding packaging stock:', error);
    res.status(500).json({
      error: 'Failed to add packaging stock',
      message: error.message
    });
  }
};

// Remove packaging stock
exports.removePackagingStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const packaging = await Packaging.findById(req.params.id);
    
    if (!packaging) {
      return res.status(404).json({
        error: 'Packaging not found'
      });
    }
    
    await packaging.removeStock(quantity);
    
    // Refresh packaging to get updated stock
    await packaging.populate('_id');
    const updatedPackaging = await Packaging.findById(req.params.id);
    
    // Check for low stock after update
    if (updatedPackaging.reorderLevel && updatedPackaging.stock <= updatedPackaging.reorderLevel) {
      try {
        const { NotificationTriggers } = require('../utils/notifications');
        await NotificationTriggers.lowPackagingStock(
          updatedPackaging.name || updatedPackaging.type,
          updatedPackaging.stock,
          updatedPackaging.reorderLevel
        );
      } catch (notifError) {
        console.warn('Could not send low packaging stock notification:', notifError.message);
      }
    }
    
    res.json({
      success: true,
      packaging: updatedPackaging,
      message: 'Packaging stock removed successfully'
    });
  } catch (error) {
    console.error('Error removing packaging stock:', error);
    res.status(500).json({
      error: 'Failed to remove packaging stock',
      message: error.message
    });
  }
};

