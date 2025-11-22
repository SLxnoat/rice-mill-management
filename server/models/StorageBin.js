const mongoose = require('mongoose');

const storageBinSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['raw', 'finished', 'byproduct'],
    required: true,
  },
  capacityKg: {
    type: Number,
    required: true,
    min: 0,
  },
  currentKg: {
    type: Number,
    default: 0,
    min: 0,
  },
  location: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'full', 'inactive'],
    default: 'active',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  indexes: [
    { name: 1 },
    { type: 1 },
    { status: 1 },
    { location: 1 },
  ]
});

// Virtual for available capacity
storageBinSchema.virtual('availableKg').get(function() {
  return Math.max(0, this.capacityKg - this.currentKg);
});

// Virtual for utilization percentage
storageBinSchema.virtual('utilizationPercent').get(function() {
  if (this.capacityKg === 0) return 0;
  return (this.currentKg / this.capacityKg) * 100;
});

// Instance methods
storageBinSchema.methods.addStock = function(quantityKg) {
  if (this.currentKg + quantityKg > this.capacityKg) {
    throw new Error('Storage bin capacity exceeded');
  }
  this.currentKg += quantityKg;
  this.lastUpdated = new Date();
  if (this.currentKg >= this.capacityKg * 0.95) {
    this.status = 'full';
  }
  return this.save();
};

storageBinSchema.methods.removeStock = function(quantityKg) {
  if (this.currentKg < quantityKg) {
    throw new Error('Insufficient stock in storage bin');
  }
  this.currentKg -= quantityKg;
  this.lastUpdated = new Date();
  if (this.status === 'full' && this.currentKg < this.capacityKg * 0.95) {
    this.status = 'active';
  }
  return this.save();
};

storageBinSchema.methods.isFull = function() {
  return this.currentKg >= this.capacityKg;
};

storageBinSchema.methods.hasSpace = function(quantityKg) {
  return (this.currentKg + quantityKg) <= this.capacityKg;
};

// Static methods
storageBinSchema.statics.findByType = function(type) {
  return this.find({ type, status: 'active' }).sort({ name: 1 });
};

storageBinSchema.statics.findAvailable = function(type, requiredKg) {
  return this.find({
    type,
    status: 'active',
    $expr: { $gte: [{ $subtract: ['$capacityKg', '$currentKg'] }, requiredKg] }
  }).sort({ currentKg: 1 }); // Sort by least used first
};

storageBinSchema.statics.getStorageSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        totalCapacity: { $sum: '$capacityKg' },
        totalCurrent: { $sum: '$currentKg' },
        binCount: { $sum: 1 },
        activeBins: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        totalCapacity: 1,
        totalCurrent: 1,
        totalAvailable: { $subtract: ['$totalCapacity', '$totalCurrent'] },
        utilizationPercent: {
          $cond: [
            { $eq: ['$totalCapacity', 0] },
            0,
            { $multiply: [{ $divide: ['$totalCurrent', '$totalCapacity'] }, 100] }
          ]
        },
        binCount: 1,
        activeBins: 1
      }
    }
  ]);
};

const StorageBin = mongoose.model('StorageBin', storageBinSchema);

module.exports = StorageBin;

