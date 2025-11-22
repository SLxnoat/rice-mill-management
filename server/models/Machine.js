const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  model: {
    type: String,
    required: true,
    trim: true,
  },
  manufacturer: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['mill', 'dryer', 'cleaner', 'grader', 'packaging', 'generator', 'conveyor', 'other'],
    required: true,
  },
  capacity: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg/h', 'kw', 'hp', 'tons/day'],
      default: 'kw'
    },
  },
  installationDate: Date,
  warrantyPeriod: {
    months: Number,
  },
  warrantyUntil: Date,
  purchaseCost: {
    amount: Number,
    currency: {
      type: String,
      default: 'LKR'
    },
  },
  supplier: {
    name: String,
    contact: String,
    warrantyTerms: String,
  },
  location: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['operational', 'maintenance', 'out_of_order', 'retired', 'standby'],
    default: 'operational',
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
    default: 'good',
  },
  lastServiceDate: Date,
  nextServiceDue: Date,
  operatingHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  maintenanceSchedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
      default: 'monthly'
    },
    estimatedHours: Number,
    checklist: [String],
  },
  partsReplaced: [{
    partName: String,
    replacedDate: Date,
    cost: Number,
    notes: String,
  }],
  currentIssues: [{
    description: String,
    reportedDate: Date,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['reported', 'in_progress', 'resolved'],
      default: 'reported'
    },
  }],
  powerConsumption: {
    averageWatts: Number,
    lastReading: Number,
    lastReadingDate: Date,
  },
  assignedTo: {
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
    { type: 1 },
    { status: 1 },
    { nextServiceDue: 1 },
    { serialNumber: 1 },
  ]
});

// Virtuals
machineSchema.virtual('isUnderWarranty').get(function() {
  return new Date() < this.warrantyUntil;
});

machineSchema.virtual('daysUntilNextService').get(function() {
  const today = new Date();
  const diffTime = this.nextServiceDue - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

machineSchema.virtual('isServiceOverdue').get(function() {
  return new Date() > this.nextServiceDue;
});

// Instance methods
machineSchema.methods.scheduleNextService = function(scheduleDate) {
  this.nextServiceDue = scheduleDate;
  this.lastServiceDate = new Date();
  return this.save();
};

machineSchema.methods.addOperatingHours = function(hours) {
  this.operatingHours += hours;
  return this.save();
};

machineSchema.methods.reportIssue = function(description, severity = 'medium') {
  this.currentIssues.push({
    description,
    reportedDate: new Date(),
    severity,
    status: 'reported'
  });
  return this.save();
};

machineSchema.methods.updateCondition = function(condition) {
  this.condition = condition;
  if (condition === 'critical') {
    this.status = 'out_of_order';
  }
  return this.save();
};

// Static methods
machineSchema.statics.getMachinesDueForMaintenance = function() {
  return this.find({
    nextServiceDue: { $lte: new Date() },
    status: { $nin: ['retired', 'out_of_order'] }
  }).sort({ nextServiceDue: 1 });
};

machineSchema.statics.getMachinesByType = function(type) {
  return this.find({ type })
    .sort({ nextServiceDue: 1 });
};

machineSchema.statics.getMaintenanceSummary = function() {
  return this.aggregate([
    {
      $match: {
        status: { $ne: 'retired' }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalOperatingHours: { $sum: '$operatingHours' }
      }
    }
  ]);
};

const Machine = mongoose.model('Machine', machineSchema);

module.exports = Machine;
