// ============================================================================
// authMiddleware.js - JWT Verification Middleware
// ============================================================================

const jwt = require('jsonwebtoken');
const redis = require('./redis');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in .env');
}

/**
 * Middleware to verify JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7);

    // Check if token is in blacklist (logged out)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked (logged out)',
      });
    }

    // Verify token signature and expiry
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

/**
 * Middleware to verify JWT and check user role
 */
const authenticateRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      await authenticate(req, res, () => {
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${allowedRoles.join(', ')}`,
          });
        }
        next();
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

module.exports = {
  authenticate,
  authenticateRole,
};
