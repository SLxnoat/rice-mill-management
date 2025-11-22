/**
 * Database Connection and Model Initialization
 * Ensures all models are loaded and database is properly connected
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Database connection options
const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// MongoDB connection URIs
const MONGO_URI_PRIMARY = process.env.MONGO_URI || 'mongodb+srv://superuser:superuser123@cluster0.xlgvetl.mongodb.net/?appName=Cluster0';
const MONGO_URI_BACKUP = process.env.MONGO_URI_BACKUP || 'mongodb://localhost:27017/rice_mill';

/**
 * Connect to MongoDB with Failover Strategy
 */
const connectDB = async () => {
  // Helper function to attempt connection
  const attemptConnection = async (uri, name) => {
    try {
      console.log(`🔗 Connecting to ${name} Database...`);
      // Hide credentials in logs
      const safeUri = uri.includes('@') ? uri.replace(/\/\/.*@/, '//***@') : uri;
      console.log(`   URI: ${safeUri}`);

      const connection = await mongoose.connect(uri, connectionOptions);

      console.log(`✅ ${name} Database connected successfully`);
      console.log(`   Database: ${connection.connection.name}`);
      console.log(`   Host: ${connection.connection.host}`);
      return connection;
    } catch (error) {
      console.warn(`⚠️ Failed to connect to ${name} Database:`, error.message);
      throw error;
    }
  };

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return mongoose.connection;
    }

    // Setup event handlers before connecting
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Strategy: Try Primary (Atlas) -> Fail -> Try Backup (Local)
    try {
      await attemptConnection(MONGO_URI_PRIMARY, 'Primary (Atlas)');
    } catch (primaryError) {
      console.warn('🔄 Switching to Backup Database...');
      try {
        await attemptConnection(MONGO_URI_BACKUP, 'Backup (Local)');
      } catch (backupError) {
        console.error('❌ CRITICAL: All database connection attempts failed.');
        throw new Error(`Primary: ${primaryError.message} | Backup: ${backupError.message}`);
      }
    }

    // Load all models to ensure they're registered
    loadAllModels();

    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection fatal error:', error.message);
    throw error;
  }
};

/**
 * Load all models to ensure they're registered with Mongoose
 */
const loadAllModels = () => {
  try {
    // Import all models - this registers them with Mongoose
    require('../models/User');
    require('../models/Customer');
    require('../models/Supplier');
    require('../models/Purchase');
    require('../models/SalesOrder');
    require('../models/Invoice');
    require('../models/ProductionBatch');
    require('../models/RawMaterials');
    require('../models/FinishedGoods');
    require('../models/Product');
    require('../models/StorageBin');
    require('../models/InventoryMovement');
    require('../models/Packaging');
    require('../models/Expense');
    require('../models/Payslip');
    require('../models/Attendance');
    require('../models/Machine');
    require('../models/MaintenanceLog');
    require('../models/Pricing');
    require('../models/MillSettings');
    require('../models/Notification');
    require('../models/ActivityLog');

    console.log('✅ All models loaded successfully');
  } catch (error) {
    console.error('❌ Error loading models:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Get database connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    name: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    models: Object.keys(mongoose.connection.models || {}).length
  };
};

/**
 * Sync database indexes
 */
const syncIndexes = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    console.log('🔄 Syncing database indexes...');

    // Get all registered models
    const models = mongoose.connection.models;
    const modelNames = Object.keys(models);

    // Sync indexes for each model
    for (const modelName of modelNames) {
      try {
        await models[modelName].syncIndexes();
        console.log(`  ✅ ${modelName} indexes synced`);
      } catch (error) {
        console.warn(`  ⚠️ Error syncing indexes for ${modelName}:`, error.message);
      }
    }

    console.log('✅ All indexes synced successfully');
  } catch (error) {
    console.error('❌ Error syncing indexes:', error);
    throw error;
  }
};

/**
 * Verify database connection and models
 */
const verifyDatabase = async () => {
  try {
    const status = getConnectionStatus();

    if (status.readyState !== 1) {
      throw new Error('Database not connected');
    }

    console.log('🔍 Verifying database connection...');
    console.log(`  State: ${status.state}`);
    console.log(`  Database: ${status.name}`);
    console.log(`  Host: ${status.host}:${status.port}`);
    console.log(`  Models registered: ${status.models}`);

    // Test query
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    console.log(`  Users in database: ${userCount}`);

    console.log('✅ Database verification successful');
    return true;
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return false;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  syncIndexes,
  verifyDatabase,
  loadAllModels,
  MONGO_URI: MONGO_URI_PRIMARY,
  MONGO_URI_BACKUP
};

