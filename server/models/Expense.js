const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['fuel', 'utilities', 'repair', 'maintenance', 'salary', 'supplies', 'transport', 'insurance', 'taxes', 'other', 'cash_outflow', 'salary_advance', 'loan_taken', 'loan_payment', 'asset_purchase'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['operational', 'maintenance', 'administrative', 'production', 'marketing'],
    required: true,
  },
  vendor: {
    name: {
      type: String,
      trim: true,
    },
    contact: {
      type: String,
      trim: true,
    },
    invoiceNumber: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'credit_card'],
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'reimbursed'],
    default: 'paid',
  },
  paidAt: Date,
  recurring: {
    type: Boolean,
    default: false,
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  },
  nextDueDate: Date,
  tags: [String],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date,
  }],
  approved: {
    type: Boolean,
    default: true, // For simpler expenses, auto-approved
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  indexes: [
    { type: 1 },
    { category: 1 },
    { date: -1 },
    { paymentStatus: 1 },
    { recordedBy: 1 },
  ]
});

// Instance methods
expenseSchema.methods.markAsPaid = function() {
  this.paymentStatus = 'paid';
  this.paidAt = new Date();
  return this.save();
};

expenseSchema.methods.approve = function(approverId) {
  this.approved = true;
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  return this.save();
};

// Static methods
expenseSchema.statics.getMonthlyExpenses = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          month: { $month: '$date' },
          year: { $year: '$date' }
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.type': 1 }
    }
  ]);
};

expenseSchema.statics.getExpenseSummary = function(startDate, endDate) {
  const matchCondition = { paymentStatus: 'paid' };
  if (startDate && endDate) {
    matchCondition.date = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

expenseSchema.statics.findOverdueRecurring = function() {
  const today = new Date();
  return this.find({
    recurring: true,
    nextDueDate: { $lte: today },
    paymentStatus: 'paid'
  });
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
