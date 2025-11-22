const mongoose = require('mongoose');

const rawMaterialsSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Paddy', 'Packaging', 'Chemical', 'Other'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'liters', 'bags', 'pieces'],
  },
  minimumStock: {
    type: Number,
    required: true,
    min: 0,
  },
  supplier: {
    type: String,
    trim: true,
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
  },
  batchNumber: {
    type: String,
    trim: true,
  },
  receivedDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
  },
  qualityVerified: {
    type: Boolean,
    default: false,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: Date,
  status: {
    type: String,
    enum: ['available', 'used', 'damaged', 'expired'],
    default: 'available',
  },
  storageLocation: {
    type: String,
    trim: true,
  },
  costPerUnit: {
    type: Number,
    min: 0,
  },
  totalCost: {
    type: Number,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  indexes: [
    { sku: 1 },
    { name: 1 },
    { category: 1 },
    { status: 1 },
    { supplier: 1 },
    { expiryDate: 1 },
  ]
});

// Calculate total cost before saving
rawMaterialsSchema.pre('save', function(next) {
  if (this.costPerUnit && this.quantity) {
    this.totalCost = this.costPerUnit * this.quantity;
  }
  next();
});

// Virtual for lastUpdated
rawMaterialsSchema.virtual('lastUpdated').get(function() {
  return this.updatedAt;
});

// Instance methods
rawMaterialsSchema.methods.markAsUsed = function() {
  this.status = 'used';
  return this.save();
};

rawMaterialsSchema.methods.markAsDamaged = function() {
  this.status = 'damaged';
  return this.save();
};

rawMaterialsSchema.methods.verifyQuality = function(verifierId) {
  this.qualityVerified = true;
  this.verifiedBy = verifierId;
  this.verifiedAt = new Date();
  return this.save();
};

// Static methods
rawMaterialsSchema.statics.findByCategory = function(category) {
  return this.find({ category, status: 'available' });
};

rawMaterialsSchema.statics.findBySupplier = function(supplier) {
  return this.find({ supplier }).populate('purchaseOrder');
};

rawMaterialsSchema.statics.getLowStockAlerts = function() {
  return this.find({
    $expr: { $lte: ['$quantity', '$minimumStock'] },
    status: 'available'
  });
};

rawMaterialsSchema.statics.getInventorySummary = function() {
  return this.aggregate([
    { $match: { status: 'available' } },
    {
      $group: {
        _id: '$category',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalCost' },
        count: { $sum: 1 },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ['$quantity', '$minimumStock'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const RawMaterials = mongoose.model('RawMaterials', rawMaterialsSchema);

module.exports = RawMaterials;
