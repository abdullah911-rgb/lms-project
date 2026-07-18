const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a signed JWT access token
 * @param {object} payload - { id, email, role }
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

/**
 * Generate a signed JWT refresh token
 * @param {object} payload - { id }
 * @returns {string} JWT token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/**
 * Verify an access token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret);
};

/**
 * Verify a refresh token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

/**
 * Set refresh token as HTTP-only cookie
 * @param {object} res - Express response object
 * @param {string} token - Refresh token
 */
const setRefreshTokenCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,           // HTTPS only in production
    sameSite: isProd ? 'none' : 'lax', // cross-origin needs 'none' in production
    maxAge: config.jwt.refreshExpiresInMs,
    path: '/',
  });
};

/**
 * Clear the refresh token cookie
 * @param {object} res - Express response object
 */
const clearRefreshTokenCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
