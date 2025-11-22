const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder',
    required: true,
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
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'],
    default: 'unpaid',
  },
  // New fields for accountant features
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'online'],
      required: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  paidAt: Date,
  status: {
    type: String,
    enum: ['active', 'cancelled'],
    default: 'active'
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  editedAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancelReason: String,
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit', 'net_30', 'net_60'],
    default: 'cash',
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  billedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  invoiceTime: {
    type: String, // Format: HH:MM:SS
  },
  preparedByName: {
    type: String,
  },
  millDetails: {
    name: String,
    address: String,
    phone: String,
    email: String,
    gst: String
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  indexes: [
    { invoiceNumber: 1 },
    { orderId: 1 },
    { customerName: 1 },
    { paymentStatus: 1 },
    { dueDate: 1 },
    { invoiceDate: -1 },
  ]
});

// Calculate amounts before saving
invoiceSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  this.taxAmount = (this.subtotal * (this.taxPercent || 0)) / 100;
  this.discountAmount = (this.subtotal * (this.discountPercent || 0)) / 100;
  this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;

  next();
});

// Update payment status based on paid amount
invoiceSchema.pre('save', function (next) {
  if (this.paidAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.paidAmount < this.totalAmount) {
    this.paymentStatus = 'partial';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  }

  // Check if overdue
  if (new Date() > this.dueDate && this.paymentStatus !== 'paid') {
    this.paymentStatus = 'overdue';
  }

  next();
});

// Virtual for balance due
invoiceSchema.virtual('balanceDue').get(function () {
  return this.totalAmount - this.paidAmount;
});

// Virtual for is overdue
invoiceSchema.virtual('isOverdue').get(function () {
  return new Date() > this.dueDate && this.paymentStatus !== 'paid';
});

// Instance methods
invoiceSchema.methods.makePayment = function (amount) {
  this.paidAmount += amount;
  return this.save();
};

invoiceSchema.methods.markAsPaid = function () {
  if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
  return this.save();
};

// Static methods
invoiceSchema.statics.findOverdue = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    paymentStatus: { $ne: 'paid' }
  }).sort({ dueDate: 1 });
};

invoiceSchema.statics.getOutstandingBalance = function (customerName = null) {
  const matchCondition = {
    paymentStatus: { $in: ['unpaid', 'partial', 'overdue'] }
  };

  if (customerName) {
    matchCondition.customerName = new RegExp(customerName, 'i');
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$customerName',
        totalOutstanding: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
        invoiceCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalOutstanding: -1 }
    }
  ]);
};

invoiceSchema.statics.getRevenueSummary = function (startDate, endDate) {
  const matchCondition = { invoiceDate: {} };

  if (startDate) matchCondition.invoiceDate.$gte = startDate;
  if (endDate) matchCondition.invoiceDate.$lte = endDate;

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' }
        },
        totalRevenue: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalTax: { $sum: '$taxAmount' },
        invoiceCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    }
  ]);
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
