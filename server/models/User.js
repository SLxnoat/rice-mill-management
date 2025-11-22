const mongoose = require('mongoose');
const { USER_ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: USER_ROLES,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  settings: {
    type: Object,
    default: {},
  },
  lastLoginAt: Date,
}, {
  timestamps: true,
  indexes: [
    { email: 1, role: 1 },
    { status: 1 },
  ]
});

// Virtual for full name
userSchema.virtual('fullname').get(function () {
  return this.name;
});

// Instance methods
userSchema.methods.isActive = function () {
  return this.status === 'active';
};

// Static methods
userSchema.statics.findByRole = function (role) {
  return this.find({ role, status: 'active' });
};

userSchema.statics.findActiveUsers = function () {
  return this.find({ status: 'active' });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
