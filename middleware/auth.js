// middleware/auth.js  — JWT guard & role guard
const { verifyAccessToken } = require('../utils/jwt');

/**
 * protect()
 * Reads Bearer token from Authorization header,
 * verifies it and attaches decoded user to req.user
 */
const protect = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;       // { id, email, role, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please login again.'
        : 'Invalid token.';
    return res.status(401).json({ success: false, message });
  }
};

/**
 * authorize(...roles)
 * Must be used AFTER protect()
 * Example: router.get('/admin', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not allowed to access this resource.`,
    });
  }
  next();
};

module.exports = { protect, authorize };
