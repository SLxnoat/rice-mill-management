const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkInTime: {
    type: Date,
  },
  checkOutTime: {
    type: Date,
  },
  hoursWorked: {
    type: Number,
    min: 0,
    max: 24,
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'leave', 'half_day', 'holiday'],
    default: 'present',
  },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'annual', 'maternity', 'emergency'],
  },
  notes: {
    type: String,
    trim: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  indexes: [
    { employeeId: 1, date: 1 },
    { date: 1 },
    { status: 1 },
    { employeeId: 1, date: -1 },
  ]
});

// Calculate hours worked before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    this.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }
  next();
});

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Virtual for is weekend
attendanceSchema.virtual('isWeekend').get(function() {
  const dayOfWeek = this.date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
});

// Instance methods
attendanceSchema.methods.checkOut = function(checkOutTime) {
  this.checkOutTime = checkOutTime;
  return this.save();
};

// Static methods
attendanceSchema.statics.findByEmployee = function(employeeId, startDate, endDate) {
  const query = { employeeId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ date: 1 });
};

attendanceSchema.statics.getMonthlyAttendance = function(employeeId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        employeeId: mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
          }
        },
        absentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
          }
        },
        leaveDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'leave'] }, 1, 0]
          }
        },
        hoursWorked: { $sum: '$hoursWorked' },
        overtimeHours: { $sum: '$overtimeHours' }
      }
    }
  ]);
};

attendanceSchema.statics.getAttendanceSummary = function(startDate, endDate) {
  const matchCondition = {};
  if (startDate && endDate) {
    matchCondition.date = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$hoursWorked' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

attendanceSchema.statics.markAbsentForMissingEntries = function() {
  // This would run daily to mark employees as absent if no attendance entry exists
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // This is a complex operation that would need to check all employees
  // and create absent entries for missing dates
  return Promise.resolve();
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
