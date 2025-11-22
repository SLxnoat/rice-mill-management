const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header: "Bearer <token>"
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        message: 'Authorization header missing or malformed. Format: Bearer <token>'
      });
    }

    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'rice-mill-jwt-secret-key-2025-production-ready-unique-secure-token';
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists and is active in database
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account has been deleted. Please contact administrator.'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Add user info to request object (include fresh data from DB)
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token format invalid. Please login again.'
      });
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid token. Please login again.'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Adds user info if token is present, but doesn't require it
 * Useful for routes that show different content for authenticated users
 */
const optionalAuthenticate = (req, res, next) => {
  try {
    // Get token from Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      const JWT_SECRET = process.env.JWT_SECRET || 'rice-mill-jwt-secret-key-2025-production-ready-unique-secure-token';
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.token = token;
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    console.debug('Optional authentication failed (expected for anon users)');
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
