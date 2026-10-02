import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';

// JWT Authentication Middleware
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated.',
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional JWT authentication (attaches user if valid token present, does not reject if missing)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = verifyToken(token);
          const user = await User.findById(decoded.id);
          if (user && user.active) {
            req.user = user;
            req.userId = user._id;
          }
        } catch {
          // Ignore invalid token in optional auth
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based Access Control Middleware
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

// Legacy / Optional PIN verification middleware
export const requireAccessPin = (req, res, next) => {
  const configuredPin = process.env.ACCESS_PIN;

  // If no PIN is configured on the backend, allow all requests
  if (!configuredPin || configuredPin.trim() === '') {
    return next();
  }

  // Exempt health check and all auth endpoints
  if (req.path === '/health' || req.path.startsWith('/api/auth/')) {
    return next();
  }

  const clientPin = req.headers['x-access-pin'];

  if (!clientPin || clientPin !== configuredPin.trim()) {
    return res.status(401).json({
      success: false,
      message: 'Access PIN required or invalid',
      pinRequired: true,
    });
  }

  next();
};
