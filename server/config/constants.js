/**
 * Application Constants
 * Centralized configuration and constants
 */

// User Roles
const USER_ROLES = [
    'admin',
    'accountant',
    'sales_manager',
    'operator',
    'labour',
    'warehouse_manager',
    'driver'
];

// Production Constants
const PRODUCTION_TOLERANCE_PCT = 0.05; // 5% tolerance for total output vs input
const DEFAULT_RICE_GRADE = 'standard';
const DEFAULT_BAG_WEIGHT_KG = 50;
const DEFAULT_EXPIRY_DAYS = 180;

// Inventory Constants
const LOW_STOCK_THRESHOLD_KG = 50;

// Rate Limiting
const RATE_LIMIT = {
    GLOBAL: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
    },
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per window
    },
};

module.exports = {
    USER_ROLES,
    PRODUCTION_TOLERANCE_PCT,
    DEFAULT_RICE_GRADE,
    DEFAULT_BAG_WEIGHT_KG,
    DEFAULT_EXPIRY_DAYS,
    LOW_STOCK_THRESHOLD_KG,
    RATE_LIMIT,
};
