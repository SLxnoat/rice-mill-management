const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  poNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  paddyType: {
    type: String,
    required: true,
    trim: true,
  },
  grossWeightKg: {
    type: Number,
    required: true,
    min: 0,
  },
  tareKg: {
    type: Number,
    default: 0,
    min: 0,
  },
  netWeightKg: {
    type: Number,
    required: true,
    min: 0,
  },
  moisturePercent: {
    type: Number,
    min: 0,
    max: 100,
  },
  qualityGrade: {
    type: String,
    enum: ['premium', 'standard', 'basic'],
    required: true,
  },
  pricePerKg: {
    type: Number,
    required: true,
    min: 0,
  },
  transportCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  unloadingCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  receivedAt: {
    type: Date,
    required: true,
  },
  storageBinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageBin',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'received', 'cancelled'],
    default: 'draft',
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  indexes: [
    { supplierId: 1 },
    { status: 1 },
    { receivedAt: 1 },
    { paddyType: 1 },
  ]
});

// Calculate net weight and total amount before saving
purchaseSchema.pre('save', function (next) {
  if (this.grossWeightKg && this.tareKg !== undefined) {
    this.netWeightKg = this.grossWeightKg - this.tareKg;
  }
  if (this.pricePerKg && this.netWeightKg) {
    const paddyCost = this.pricePerKg * this.netWeightKg;
    this.totalAmount = paddyCost + (this.transportCost || 0) + (this.unloadingCost || 0);
  }
  next();
});

// Virtual for formatted date
purchaseSchema.virtual('formattedDate').get(function () {
  return this.receivedAt.toISOString().split('T')[0];
});

// Instance methods
purchaseSchema.methods.isReceived = function () {
  return this.status === 'received';
};

purchaseSchema.methods.getTotalCost = function () {
  return this.pricePerKg * this.netWeightKg;
};

// Static methods
purchaseSchema.statics.getTotalPurchased = function (supplierId, startDate, endDate) {
  const query = {};
  if (supplierId) query.supplierId = supplierId;
  if (startDate && endDate) {
    query.receivedAt = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: query },
    { $match: { status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: null,
        totalWeight: { $sum: '$netWeightKg' },
        totalAmount: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

purchaseSchema.statics.findBySupplier = function (supplierId) {
  return this.find({ supplierId, status: { $ne: 'cancelled' } })
    .populate('supplierId', 'name')
    .sort({ receivedAt: -1 });
};

purchaseSchema.statics.findPendingDeliveries = function () {
  return this.find({
    status: { $in: ['confirmed', 'draft'] },
    receivedAt: { $lte: new Date() }
  });
};

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
