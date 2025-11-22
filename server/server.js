const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
require('express-async-errors');
const rateLimit = require('express-rate-limit');
const { RATE_LIMIT } = require('./config/constants');

const app = express();

// CORS Configuration - Allow React development server and production domain
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL, // Production frontend URL
    process.env.FRONTEND_URL_SECONDARY // Optional secondary domain
  ].filter(Boolean), // Remove undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Content-Type-Options', 'Accept'],
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT.GLOBAL.windowMs,
  max: RATE_LIMIT.GLOBAL.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// MongoDB Connection - Use centralized database config
const { connectDB, loadAllModels } = require('./config/database');

// Load all models before connecting
loadAllModels();

// Connect to database
connectDB().catch((error) => {
  console.error('MongoDB connection error:', error.message);
  process.exit(1);
});

// Initialize auto-numbering settings on startup
const { initializeAutoNumbering } = require('./utils/autoNumbering');
initializeAutoNumbering().catch(err => {
  console.warn('Could not initialize auto-numbering settings:', err.message);
});

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/inventory', require('./routes/inventory'));
app.use('/api/v1/production', require('./routes/production'));
app.use('/api/v1/sales', require('./routes/sales'));
app.use('/api/v1/purchases', require('./routes/purchases'));
app.use('/api/v1/suppliers', require('./routes/suppliers'));
app.use('/api/v1/customers', require('./routes/customers'));
app.use('/api/v1/accounting', require('./routes/accounting'));
app.use('/api/v1/payroll', require('./routes/payroll'));
app.use('/api/v1/maintenance', require('./routes/maintenance'));
app.use('/api/v1/pricing', require('./routes/pricing'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/activityLogs', require('./routes/activityLogs'));
app.use('/api/v1/settings', require('./routes/settings'));
app.use('/api/v1/storage-bins', require('./routes/storageBins'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/inventory-movements', require('./routes/inventoryMovements'));
app.use('/api/v1/packaging', require('./routes/packaging'));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Rice Mill Management System API',
    version: '1.0.0',
    status: 'Running',
    backend: `http://localhost:${process.env.PORT || 5000}`,
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    apiDocs: `/api/v1`,
    health: '/health',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API documentation route
app.get('/api/v1', (req, res) => res.json({
  message: 'Rice Mill Management API v1.0',
  version: '1.0.0',
  availableEndpoints: {
    auth: '/api/v1/auth',
    users: '/api/v1/users',
    inventory: '/api/v1/inventory',
    production: '/api/v1/production',
    sales: '/api/v1/sales',
    purchases: '/api/v1/purchases',
    suppliers: '/api/v1/suppliers',
    customers: '/api/v1/customers',
    accounting: '/api/v1/accounting',
    payroll: '/api/v1/payroll',
    maintenance: '/api/v1/maintenance',
    pricing: '/api/v1/pricing',
    reports: '/api/v1/reports',
    dashboard: '/api/v1/dashboard',
    notifications: '/api/v1/notifications',
    activityLogs: '/api/v1/activityLogs',
    settings: '/api/v1/settings',
    storageBins: '/api/v1/storage-bins',
    products: '/api/v1/products',
    inventoryMovements: '/api/v1/inventory-movements',
    packaging: '/api/v1/packaging'
  },
  documentation: {
    health: '/health',
    apiDocs: '/api/v1'
  }
}));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      '/api/v1/auth/*',
      '/api/v1/users/*',
      '/api/v1/inventory/*',
      '/api/v1/production/*',
      '/api/v1/sales/*',
      '/api/v1/purchases/*',
      '/api/v1/suppliers/*',
      '/api/v1/customers/*',
      '/api/v1/accounting/*',
      '/api/v1/payroll/*',
      '/api/v1/maintenance/*',
      '/api/v1/pricing/*',
      '/api/v1/reports/*',
      '/api/v1/dashboard/*',
      '/api/v1/notifications/*',
      '/api/v1/activityLogs/*',
      '/api/v1/settings/*',
      '/api/v1/storage-bins/*',
      '/api/v1/products/*',
      '/api/v1/inventory-movements/*',
      '/api/v1/packaging/*'
    ],
    help: 'Visit /api/v1 for full API documentation'
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid data provided',
      details: errors
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong. Please try again later.'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Basic server start (simplified from complex port checking)
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Rice Mill Management System API Server');
  console.log('='.repeat(50));
  console.log(`Server running on port: ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api/v1`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (dev only!)'}`);
  console.log(`MongoDB: ${process.env.MONGO_URI || 'mongodb://localhost:27017/rice_mill'}`);
  console.log('='.repeat(50));
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error('Please kill the process using this port or use a different port.');
    process.exit(1);
  } else {
    console.error('Server error:', error.message);
  }
});

module.exports = app;
