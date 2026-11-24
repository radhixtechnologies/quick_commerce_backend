const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_quick_commerce_jwt_key_2026_x!90';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
