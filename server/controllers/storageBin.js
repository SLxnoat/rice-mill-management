const StorageBin = require('../models/StorageBin');
const { validationResult } = require('express-validator');

// Get all storage bins
exports.getStorageBins = async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    const bins = await StorageBin.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      bins
    });
  } catch (error) {
    console.error('Error fetching storage bins:', error);
    res.status(500).json({
      error: 'Failed to fetch storage bins',
      message: error.message
    });
  }
};

// Get single storage bin
exports.getStorageBinById = async (req, res) => {
  try {
    const bin = await StorageBin.findById(req.params.id);
    
    if (!bin) {
      return res.status(404).json({
        error: 'Storage bin not found'
      });
    }
    
    res.json({
      success: true,
      bin
    });
  } catch (error) {
    console.error('Error fetching storage bin:', error);
    res.status(500).json({
      error: 'Failed to fetch storage bin',
      message: error.message
    });
  }
};

// Create storage bin
exports.createStorageBin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const bin = new StorageBin(req.body);
    await bin.save();
    
    res.status(201).json({
      success: true,
      bin,
      message: 'Storage bin created successfully'
    });
  } catch (error) {
    console.error('Error creating storage bin:', error);
    if (error.code === 11000) {
      res.status(400).json({
        error: 'Duplicate storage bin name',
        message: 'A storage bin with this name already exists'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create storage bin',
        message: error.message
      });
    }
  }
};

// Update storage bin
exports.updateStorageBin = async (req, res) => {
  try {
    const bin = await StorageBin.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!bin) {
      return res.status(404).json({
        error: 'Storage bin not found'
      });
    }

    // Check for capacity warning (80% or more)
    if (bin.capacityKg && bin.currentKg) {
      const utilizationPercent = Math.round((bin.currentKg / bin.capacityKg) * 100);
      if (utilizationPercent >= 80) {
        try {
          const { NotificationTriggers } = require('../utils/notifications');
          await NotificationTriggers.storageBinCapacityWarning(
            bin.name || bin.binNumber,
            utilizationPercent
          );
        } catch (notifError) {
          console.warn('Could not send storage bin capacity notification:', notifError.message);
        }
      }
    }
    
    res.json({
      success: true,
      bin,
      message: 'Storage bin updated successfully'
    });
  } catch (error) {
    console.error('Error updating storage bin:', error);
    res.status(500).json({
      error: 'Failed to update storage bin',
      message: error.message
    });
  }
};

// Delete storage bin
exports.deleteStorageBin = async (req, res) => {
  try {
    const bin = await StorageBin.findById(req.params.id);
    
    if (!bin) {
      return res.status(404).json({
        error: 'Storage bin not found'
      });
    }
    
    if (bin.currentKg > 0) {
      return res.status(400).json({
        error: 'Cannot delete storage bin with stock',
        message: `Storage bin has ${bin.currentKg}kg of stock. Please empty it first.`
      });
    }
    
    await bin.deleteOne();
    
    res.json({
      success: true,
      message: 'Storage bin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting storage bin:', error);
    res.status(500).json({
      error: 'Failed to delete storage bin',
      message: error.message
    });
  }
};

// Get storage summary
exports.getStorageSummary = async (req, res) => {
  try {
    const summary = await StorageBin.getStorageSummary();
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching storage summary:', error);
    res.status(500).json({
      error: 'Failed to fetch storage summary',
      message: error.message
    });
  }
};

// Find available bins for a given quantity
exports.findAvailableBins = async (req, res) => {
  try {
    const { type, requiredKg } = req.query;
    
    if (!type || !requiredKg) {
      return res.status(400).json({
        error: 'Type and requiredKg are required'
      });
    }
    
    const bins = await StorageBin.findAvailable(type, parseFloat(requiredKg));
    
    res.json({
      success: true,
      bins
    });
  } catch (error) {
    console.error('Error finding available bins:', error);
    res.status(500).json({
      error: 'Failed to find available bins',
      message: error.message
    });
  }
};

