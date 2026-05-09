const express = require('express');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const db = admin.firestore().collection('users');

// Simple wrapper to catch async errors so we can ditch try/catch blocks
const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// --- Routes ---

// Get current profile
router.get('/me', authenticateToken, catchAsync(async (req, res) => {
  const doc = await db.doc(req.user.uid).get();
  
  // Return doc data if it exists, otherwise just the basic auth info
  res.json(doc.exists ? { id: doc.id, ...doc.data() } : { id: req.user.uid, username: '' });
}));

// Create or Update Profile
router.post('/profile', authenticateToken, catchAsync(async (req, res) => {
  const { username, phone } = req.body;
  const uid = req.user.uid;

  if (!username?.trim()) return res.status(400).send('Username required');

  // Check availability
  const snapshot = await db.where('usernameLower', '==', username.trim().toLowerCase()).get();
  const isTaken = snapshot.docs.some(doc => doc.id !== uid);
  
  if (isTaken) return res.status(409).send('Username taken');

  const userData = {
    username: username.trim(),
    usernameLower: username.trim().toLowerCase(),
    email: req.user.email,
    phone: phone || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.doc(uid).set(userData, { merge: true });
  res.json(userData);
}));

// Search users
router.get('/search', authenticateToken, catchAsync(async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  const snapshot = await db
    .where('username', '>=', query)
    .where('username', '<=', query + '\uf8ff')
    .limit(10).get();

  res.json(snapshot.docs.filter(d => d.id !== req.user.uid).map(d => ({ id: d.id, ...d.data() })));
}));

module.exports = router;
