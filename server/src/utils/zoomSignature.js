const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a Zoom Meeting SDK JWT signature (required since SDK v2.0+).
 * Uses Client ID + Client Secret from a Meeting SDK / General app on Zoom Marketplace.
 */
function generateZoomSignature(meetingNumber, role = 0) {
  const sdkKey = config.zoom.sdkKey;
  const sdkSecret = config.zoom.sdkSecret;

  if (!sdkKey || !sdkSecret) {
    throw new Error('Zoom Meeting SDK credentials are not configured.');
  }

  const mn = parseInt(String(meetingNumber).replace(/\D/g, ''), 10);
  if (!mn || Number.isNaN(mn)) {
    throw new Error('Invalid meeting number.');
  }

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;

  const payload = {
    sdkKey,
    appKey: sdkKey,
    mn,
    role: parseInt(role, 10) || 0,
    iat,
    exp,
    tokenExp: exp,
  };

  return jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
}

module.exports = { generateZoomSignature };
