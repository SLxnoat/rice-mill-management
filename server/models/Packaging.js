const mongoose = require('mongoose');

const packagingSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['10kg', '25kg', '50kg', 'bulk', 'custom'],
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  weightKg: {
    type: Number,
    required: true,
    min: 0,
  },
  material: {
    type: String,
    enum: ['plastic', 'jute', 'paper', 'polypropylene', 'other'],
    default: 'plastic',
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  reorderLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  supplier: {
    name: String,
    contact: String,
  },
  specifications: {
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    },
    capacity: Number,
    strength: String,
  },
  active: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  indexes: [
    { type: 1 },
    { active: 1 },
    { material: 1 },
  ]
});

// Virtual for total stock value
packagingSchema.virtual('stockValue').get(function() {
  return this.stockQuantity * this.costPerUnit;
});

// Virtual for is low stock
packagingSchema.virtual('isLowStock').get(function() {
  return this.stockQuantity <= this.reorderLevel;
});

// Instance methods
packagingSchema.methods.addStock = function(quantity) {
  this.stockQuantity += quantity;
  return this.save();
};

packagingSchema.methods.removeStock = function(quantity) {
  if (this.stockQuantity < quantity) {
    throw new Error('Insufficient packaging stock');
  }
  this.stockQuantity -= quantity;
  return this.save();
};

packagingSchema.methods.getTotalCost = function(quantity) {
  return quantity * this.costPerUnit;
};

// Static methods
packagingSchema.statics.findByType = function(type) {
  return this.find({ type, active: true }).sort({ name: 1 });
};

packagingSchema.statics.findLowStock = function() {
  return this.find({
    active: true,
    $expr: { $lte: ['$stockQuantity', '$reorderLevel'] }
  });
};

packagingSchema.statics.getStockSummary = function() {
  return this.aggregate([
    {
      $match: { active: true }
    },
    {
      $group: {
        _id: '$type',
        totalStock: { $sum: '$stockQuantity' },
        totalValue: { $sum: { $multiply: ['$stockQuantity', '$costPerUnit'] } },
        count: { $sum: 1 },
        lowStockCount: {
          $sum: {
            $cond: [
              { $lte: ['$stockQuantity', '$reorderLevel'] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const Packaging = mongoose.model('Packaging', packagingSchema);

module.exports = Packaging;

