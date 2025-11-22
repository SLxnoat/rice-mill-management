/**
 * Consolidated model exports for easy importing
 * This file ensures all models are loaded and registered with Mongoose
 * Import this file to ensure all models are available
 */

// Core Models
const User = require('./User');
const Customer = require('./Customer');
const Supplier = require('./Supplier');

// Transaction Models
const Purchase = require('./Purchase');
const SalesOrder = require('./SalesOrder');
const Invoice = require('./Invoice');

// Production Models
const ProductionBatch = require('./ProductionBatch');
const RawMaterials = require('./RawMaterials');
const FinishedGoods = require('./FinishedGoods');

// Inventory Models
const Product = require('./Product');
const StorageBin = require('./StorageBin');
const InventoryMovement = require('./InventoryMovement');
const Packaging = require('./Packaging');

// Financial Models
const Expense = require('./Expense');
const Payslip = require('./Payslip');
const Attendance = require('./Attendance');

// Maintenance Models
const Machine = require('./Machine');
const MaintenanceLog = require('./MaintenanceLog');

// System Models
const Pricing = require('./Pricing');
const MillSettings = require('./MillSettings');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');

module.exports = {
  // Core
  User,
  Customer,
  Supplier,
  // Transactions
  Purchase,
  SalesOrder,
  Invoice,
  // Production
  ProductionBatch,
  RawMaterials,
  FinishedGoods,
  // Inventory
  Product,
  StorageBin,
  InventoryMovement,
  Packaging,
  // Financial
  Expense,
  Payslip,
  Attendance,
  // Maintenance
  Machine,
  MaintenanceLog,
  // System
  Pricing,
  MillSettings,
  Notification,
  ActivityLog
};
