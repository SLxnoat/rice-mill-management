const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true,
  },
  serviceDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  serviceType: {
    type: String,
    enum: ['preventive', 'corrective', 'predictive', 'emergency', 'routine', 'overhaul'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'deferred'],
    default: 'scheduled',
  },
  // Details
  description: {
    type: String,
    required: true,
    trim: true,
  },
  workPerformed: {
    type: String,
    trim: true,
  },
  findings: [{
    description: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'serious', 'critical'],
      default: 'minor'
    },
    status: {
      type: String,
      enum: ['resolved', 'pending', 'needs_attention'],
      default: 'resolved'
    },
  }],
  partsChanged: [{
    partName: {
      type: String,
      required: true,
      trim: true,
    },
    partNumber: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    cost: {
      type: Number,
      min: 0,
    },
    supplier: String,
    warrantyMonths: Number,
  }],
  totalCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  laborHours: {
    type: Number,
    min: 0,
  },
  laborRate: {
    type: Number,
    default: 0,
    min: 0,
  },
  nextServiceDate: Date,
  // Personnel
  performedBy: [{
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    technicianName: String,
    hoursWorked: Number,
  }],
  supervisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Approvals
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  // Documentation
  documentation: [{
    type: {
      type: String,
      enum: ['photo', 'video', 'document', 'manual', 'checklist'],
      required: true,
    },
    filename: String,
    url: String,
    description: String,
    uploadedAt: Date,
  }],
  checklistCompleted: [{
    item: String,
    completed: {
      type: Boolean,
      default: false,
    },
    notes: String,
  }],
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false,
  },
  followUpDate: Date,
  followUpNotes: String,
  // Machine status before/after
  machineStatusBefore: {
    type: String,
    enum: ['operational', 'maintenance', 'out_of_order', 'standby'],
  },
  machineStatusAfter: {
    type: String,
    enum: ['operational', 'maintenance', 'out_of_order', 'standby'],
    default: 'operational',
  },
  downtimeHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Costs and approvals
  estimatedCost: {
    type: Number,
    min: 0,
  },
  budgetApproved: {
    type: Boolean,
    default: true,
  },
  budgetAmount: {
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
    { machineId: 1, serviceDate: -1 },
    { serviceType: 1 },
    { status: 1 },
    { serviceDate: -1 },
    { nextServiceDate: 1 },
  ]
});

// Calculate total cost before saving
maintenanceLogSchema.pre('save', function(next) {
  let partsCost = 0;
  let laborCost = 0;

  // Calculate parts cost
  if (this.partsChanged && this.partsChanged.length > 0) {
    partsCost = this.partsChanged.reduce((sum, part) => sum + (part.cost || 0), 0);
  }

  // Calculate labor cost
  if (this.laborHours && this.laborRate) {
    laborCost = this.laborHours * this.laborRate;
  }

  this.totalCost = partsCost + laborCost;
  next();
});

// Virtuals
maintenanceLogSchema.virtual('isOverdue').get(function() {
  return this.nextServiceDate && new Date() > this.nextServiceDate;
});

maintenanceLogSchema.virtual('formattedServiceDate').get(function() {
  return this.serviceDate.toISOString().split('T')[0];
});

// Instance methods
maintenanceLogSchema.methods.completeService = function(workPerformed, nextServiceDate) {
  this.status = 'completed';
  this.workPerformed = workPerformed;
  if (nextServiceDate) {
    this.nextServiceDate = nextServiceDate;
  }
  return this.save();
};

maintenanceLogSchema.methods.addFinding = function(description, severity = 'minor') {
  this.findings.push({
    description,
    severity,
    status: 'pending'
  });
  return this.save();
};

maintenanceLogSchema.methods.addPartChanged = function(partDetails) {
  this.partsChanged.push(partDetails);
  return this.save();
};

// Static methods
maintenanceLogSchema.statics.findByMachine = function(machineId) {
  return this.find({ machineId })
    .populate('machineId', 'name serialNumber')
    .populate('performedBy.technicianId', 'name')
    .sort({ serviceDate: -1 });
};

maintenanceLogSchema.statics.getMaintenanceSummary = function(startDate, endDate) {
  const matchCondition = {};
  if (startDate && endDate) {
    matchCondition.serviceDate = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: { status: 'completed', ...matchCondition } },
    {
      $group: {
        _id: '$serviceType',
        totalCost: { $sum: '$totalCost' },
        totalDowntime: { $sum: '$downtimeHours' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalCost: -1 }
    }
  ]);
};

maintenanceLogSchema.statics.findOverdueMaintenance = function() {
  return this.find({
    nextServiceDate: { $lte: new Date() },
    status: { $ne: 'completed' }
  }).populate('machineId', 'name status');
};

maintenanceLogSchema.statics.getMonthlyMaintenanceReport = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        serviceDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          serviceType: '$serviceType',
          week: { $week: '$serviceDate' }
        },
        totalCost: { $sum: '$totalCost' },
        totalDowntime: { $sum: '$downtimeHours' },
        maintenanceCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.week': 1 }
    }
  ]);
};

const MaintenanceLog = mongoose.model('MaintenanceLog', maintenanceLogSchema);

module.exports = MaintenanceLog;
