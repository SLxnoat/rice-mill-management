const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // Would be created if customer management is added
    // For now, we can use supplier as customers too
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  customerAddress: {
    type: String,
    trim: true,
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  items: [{
    sku: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    qtyKg: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'invoiced', 'shipped', 'delivered', 'cancelled'],
    default: 'draft',
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  deliveryDate: {
    type: Date,
    required: true,
  },
  shippingAddress: {
    type: String,
    trim: true,
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit', 'net_30', 'net_60'],
    default: 'cash',
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'pickup',
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dispatchDate: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
}, {
  timestamps: true,
  indexes: [
    { orderNumber: 1 },
    { customerName: 1 },
    { status: 1 },
    { orderDate: -1 },
    { deliveryDate: 1 },
    { createdBy: 1 },
  ]
});

// Calculate total amount before validation
salesOrderSchema.pre('validate', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }
  next();
});

// Virtual for is overdue
salesOrderSchema.virtual('isOverdue').get(function () {
  return new Date() > this.deliveryDate && this.status !== 'delivered';
});

// Virtual for days until delivery
salesOrderSchema.virtual('daysUntilDelivery').get(function () {
  const today = new Date();
  const diffTime = this.deliveryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Instance methods
salesOrderSchema.methods.confirmOrder = function () {
  this.status = 'confirmed';
  return this.save();
};

salesOrderSchema.methods.shipOrder = function () {
  this.status = 'shipped';
  return this.save();
};

salesOrderSchema.methods.markDelivered = function () {
  this.status = 'delivered';
  return this.save();
};

salesOrderSchema.methods.cancelOrder = function () {
  this.status = 'cancelled';
  return this.save();
};

salesOrderSchema.methods.addInvoice = function (invoiceId) {
  this.invoiceId = invoiceId;
  return this.save();
};

// Static methods
salesOrderSchema.statics.findPendingDeliveries = function () {
  return this.find({
    status: { $nin: ['delivered', 'cancelled'] },
    deliveryDate: { $lte: new Date() }
  }).sort({ deliveryDate: 1 });
};

salesOrderSchema.statics.findUpcomingDeliveries = function (daysFromNow = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);

  return this.find({
    status: { $nin: ['delivered', 'cancelled'] },
    deliveryDate: { $lte: futureDate }
  }).sort({ deliveryDate: 1 });
};

salesOrderSchema.statics.getSalesSummary = function (startDate, endDate) {
  const matchCondition = {
    status: { $ne: 'cancelled' },
    orderDate: {}
  };

  if (startDate) matchCondition.orderDate.$gte = startDate;
  if (endDate) matchCondition.orderDate.$lte = endDate;

  return this.aggregate([
    { $match: matchCondition },
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' },
          day: { $dayOfMonth: '$orderDate' }
        },
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: '$items.qtyKg' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    }
  ]);
};

salesOrderSchema.statics.findByCustomer = function (customerName) {
  return this.find({
    customerName: new RegExp(customerName, 'i'),
    status: { $ne: 'cancelled' }
  }).sort({ orderDate: -1 });
};

salesOrderSchema.statics.getPendingRevenue = function () {
  return this.aggregate([
    {
      $match: {
        status: { $in: ['confirmed', 'invoiced', 'shipped'] }
      }
    },
    {
      $group: {
        _id: null,
        totalPending: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);

module.exports = SalesOrder;
