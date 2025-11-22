const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');
const { login, register, getCurrentUser, changePassword, logout, resetUserPassword } = require('../controllers/auth');
const { RATE_LIMIT } = require('../config/constants');

const router = express.Router();

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: RATE_LIMIT.AUTH.windowMs,
    max: RATE_LIMIT.AUTH.max,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// Public routes (no authentication required) with strict rate limiting
router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/logout', logout);

// Protected routes (require authentication)
router.get('/me', authenticate, getCurrentUser);
router.put('/change-password', authenticate, changePassword);
router.post('/reset-password', authenticate, requireAdmin, resetUserPassword);

module.exports = router;
