const admin = require('firebase-admin');
const logger = require('../utils/logger');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // decodedToken contains uid, email, etc.
    next();
  } catch (error) {
    logger.warn('Firebase token verification failed', {
      reason: error.code || error.message,
      ip: req.ip,
    });
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
}

module.exports = { authenticateToken };
