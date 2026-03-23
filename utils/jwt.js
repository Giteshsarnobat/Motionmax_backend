// utils/jwt.js  — sign & verify helpers
const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * Generate a short-lived access token (default 15 min)
 */
const signAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer:    'jwt-auth-app',
  });

/**
 * Generate a long-lived refresh token (default 7 days)
 */
const signRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer:    'jwt-auth-app',
  });

/**
 * Verify access token — throws if invalid/expired
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, ACCESS_SECRET, { issuer: 'jwt-auth-app' });

/**
 * Verify refresh token — throws if invalid/expired
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET, { issuer: 'jwt-auth-app' });

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
