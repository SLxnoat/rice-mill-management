const mongoose = require('mongoose');

const finishedGoodsSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionBatch',
    required: true,
  },
  paddyType: {
    type: String,
    enum: ['nadu', 'samba'],
    required: true,
  },
  riceGrade: {
    type: String,
    enum: ['premium', 'standard', 'broken'],
    required: true,
  },
  weightKg: {
    type: Number,
    required: true,
    min: 0,
  },
  bagCount: {
    type: Number,
    required: true,
    min: 0,
  },
  bagWeightKg: {
    type: Number,
    enum: [1, 5, 10, 25, 50], // Standard bag sizes
    required: true,
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true, // Allow null values for unique constraint
  },
  qrCode: String,
  packedAt: {
    type: Date,
    required: true,
  },
  storageBinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageBin',
  },
  locationNotes: {
    type: String,
    trim: true,
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
    enum: ['in_stock', 'sold', 'damaged', 'expired'],
    default: 'in_stock',
  },
  expiryDate: {
    type: Date,
    required: true, // Rice typically has expiration dates
  },
  notes: {
    type: String,
    trim: true,
  },
  pricePerKg: {
    type: Number,
    min: 0,
  },
  totalValue: {
    type: Number,
    min: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { sku: 1 },
    { batchId: 1 },
    { status: 1 },
    { expiryDate: 1 },
    { paddyType: 1, riceGrade: 1 },
    { storageBinId: 1 },
  ]
});

// Calculate total value before saving
finishedGoodsSchema.pre('save', function(next) {
  if (this.pricePerKg && this.weightKg) {
    this.totalValue = this.pricePerKg * this.weightKg;
  }
  next();
});

// Virtual for remaining shelf life
finishedGoodsSchema.virtual('daysToExpiry').get(function() {
  const today = new Date();
  const diffTime = this.expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is expired
finishedGoodsSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Instance methods
finishedGoodsSchema.methods.markAsSold = function() {
  this.status = 'sold';
  return this.save();
};

finishedGoodsSchema.methods.markAsDamaged = function() {
  this.status = 'damaged';
  return this.save();
};

finishedGoodsSchema.methods.updateLocation = function(storageBinId, locationNotes) {
  this.storageBinId = storageBinId;
  this.locationNotes = locationNotes;
  return this.save();
};

finishedGoodsSchema.methods.verifyQuality = function(verifierId) {
  this.qualityVerified = true;
  this.verifiedBy = verifierId;
  this.verifiedAt = new Date();
  return this.save();
};

// Static methods
finishedGoodsSchema.statics.findByBatch = function(batchId) {
  return this.find({ batchId }).populate('batchId');
};

finishedGoodsSchema.statics.findByStorageBin = function(storageBinId) {
  return this.find({ storageBinId, status: 'in_stock' });
};

finishedGoodsSchema.statics.findExpiringSoon = function(daysFromNow = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysFromNow);

  return this.find({
    expiryDate: { $lte: expiryDate },
    status: 'in_stock'
  }).sort({ expiryDate: 1 });
};

finishedGoodsSchema.statics.getInventorySummary = function() {
  return this.aggregate([
    { $match: { status: 'in_stock' } },
    {
      $group: {
        _id: { paddyType: '$paddyType', grade: '$riceGrade' },
        totalWeight: { $sum: '$weightKg' },
        totalValue: { $sum: '$totalValue' },
        totalBags: { $sum: '$bagCount' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$pricePerKg' }
      }
    },
    {
      $sort: { '_id.paddyType': 1, '_id.grade': 1 }
    }
  ]);
};

finishedGoodsSchema.statics.getLowStockAlerts = function(minThreshold = 100) {
  return this.aggregate([
    { $match: { status: 'in_stock' } },
    {
      $group: {
        _id: { paddyType: '$paddyType', grade: '$riceGrade' },
        totalWeight: { $sum: '$weightKg' }
      }
    },
    {
      $match: { totalWeight: { $lt: minThreshold } }
    }
  ]);
};

const FinishedGoods = mongoose.model('FinishedGoods', finishedGoodsSchema);

module.exports = FinishedGoods;
