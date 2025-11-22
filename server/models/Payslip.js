const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2050,
  },
  period: {
    startDate: Date,
    endDate: Date,
  },
  // Salary components
  basicSalary: {
    type: Number,
    default: 0,
    min: 0,
  },
  overtimePay: {
    type: Number,
    default: 0,
    min: 0,
  },
  allowances: {
    type: Number,
    default: 0,
    min: 0,
  },
  bonuses: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Deductions
  incomeTax: {
    type: Number,
    default: 0,
    min: 0,
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0,
  },
  advances: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0,
  },
  netSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  // Attendance summary for the month
  attendanceSummary: {
    totalDays: Number,
    presentDays: Number,
    absentDays: Number,
    leaveDays: Number,
    hoursWorked: Number,
    overtimeHours: Number,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
  },
  paidAt: Date,
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque'],
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  indexes: [
    { employeeId: 1, month: 1, year: 1 },
    { paymentStatus: 1 },
    { paidAt: 1 },
    { employeeId: 1, paidAt: -1 },
  ]
});

// Calculate totals before saving
payslipSchema.pre('save', function(next) {
  this.totalEarnings = this.basicSalary + this.overtimePay + this.allowances + this.bonuses;
  this.totalDeductions = this.incomeTax + this.deductions + this.advances;
  this.netSalary = this.totalEarnings - this.totalDeductions;
  next();
});

// Virtual for payslip period string
payslipSchema.virtual('periodString').get(function() {
  return `${this.month}-${this.year}`;
});

// Virtual for is paid
payslipSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'paid';
});

// Instance methods
payslipSchema.methods.markAsPaid = function(paymentMethod = 'cash') {
  this.paymentStatus = 'paid';
  this.paidAt = new Date();
  this.paymentMethod = paymentMethod;
  return this.save();
};

payslipSchema.methods.markAsProcessed = function() {
  this.paymentStatus = 'paid';
  return this.save();
};

payslipSchema.methods.approve = function(approverId) {
  this.approvedBy = approverId;
  return this.save();
};

// Static methods
payslipSchema.statics.findByEmployee = function(employeeId, limit = 12) {
  return this.find({ employeeId })
    .populate('employeeId', 'name')
    .populate('generatedBy', 'name')
    .sort({ year: -1, month: -1 })
    .limit(limit);
};

payslipSchema.statics.getMonthlyPayrollSummary = function(year, month) {
  return this.aggregate([
    {
      $match: {
        year: year,
        month: month
      }
    },
    {
      $group: {
        _id: null,
        totalBasic: { $sum: '$basicSalary' },
        totalOvertime: { $sum: '$overtimePay' },
        totalAllowances: { $sum: '$allowances' },
        totalEarnings: { $sum: '$totalEarnings' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNetSalary: { $sum: '$netSalary' },
        totalPaid: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$netSalary', 0]
          }
        },
        employeeCount: { $sum: 1 },
        paidCount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

payslipSchema.statics.getPendingPayslips = function() {
  return this.find({
    paymentStatus: { $ne: 'paid' }
  }).populate('employeeId', 'name');
};

payslipSchema.statics.existsForPeriod = function(employeeId, year, month) {
  return this.findOne({
    employeeId: employeeId,
    year: year,
    month: month
  }).select('_id');
};

const Payslip = mongoose.model('Payslip', payslipSchema);

module.exports = Payslip;
