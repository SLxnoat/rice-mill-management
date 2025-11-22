const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUST'],
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  qtyKg: {
    type: Number,
    required: true,
  },
  fromBin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageBin',
  },
  toBin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageBin',
  },
  refType: {
    type: String,
    enum: ['purchase', 'production', 'sale', 'adjustment', 'transfer'],
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  reason: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  unitCost: {
    type: Number,
    min: 0,
  },
  totalCost: {
    type: Number,
    min: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { productId: 1, createdAt: -1 },
    { refType: 1, refId: 1 },
    { createdAt: -1 },
    { type: 1, createdAt: -1 },
    { fromBin: 1 },
    { toBin: 1 },
  ]
});

// Calculate total cost before saving
inventoryMovementSchema.pre('save', function(next) {
  if (this.unitCost && this.qtyKg) {
    this.totalCost = this.unitCost * this.qtyKg;
  }
  next();
});

// Virtual for formatted date
inventoryMovementSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString().split('T')[0];
});

// Static methods
inventoryMovementSchema.statics.getProductHistory = function(productId, startDate, endDate) {
  const query = { productId };
  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lte: endDate };
  }
  return this.find(query)
    .populate('fromBin', 'name location')
    .populate('toBin', 'name location')
    .populate('createdBy', 'name email')
    .populate('productId', 'sku name')
    .sort({ createdAt: -1 });
};

inventoryMovementSchema.statics.getStockBalance = function(productId, asOfDate = new Date()) {
  return this.aggregate([
    {
      $match: {
        productId: mongoose.Types.ObjectId(productId),
        createdAt: { $lte: asOfDate }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$qtyKg' }
      }
    }
  ]).then(results => {
    let balance = 0;
    results.forEach(result => {
      if (result._id === 'IN' || result._id === 'ADJUST') {
        balance += result.total;
      } else if (result._id === 'OUT') {
        balance -= result.total;
      }
    });
    return balance;
  });
};

inventoryMovementSchema.statics.getMovementsByRef = function(refType, refId) {
  return this.find({ refType, refId })
    .populate('productId', 'sku name')
    .populate('fromBin', 'name')
    .populate('toBin', 'name')
    .sort({ createdAt: 1 });
};

inventoryMovementSchema.statics.getMovementSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          productId: '$productId'
        },
        totalQty: { $sum: '$qtyKg' },
        totalCost: { $sum: '$totalCost' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $project: {
        type: '$_id.type',
        productId: '$_id.productId',
        productName: '$product.name',
        productSKU: '$product.sku',
        totalQty: 1,
        totalCost: 1,
        count: 1
      }
    },
    {
      $sort: { totalQty: -1 }
    }
  ]);
};

const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);

module.exports = InventoryMovement;

