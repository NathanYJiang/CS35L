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

// Create or Update Profile (also accepts settings from Settings page)
router.post('/profile', authenticateToken, catchAsync(async (req, res) => {
  const { username, phone, settings } = req.body;
  const uid = req.user.uid;

  // If only settings are being updated (from Settings page), skip username validation
  if (settings && !username) {
    await db.doc(uid).set({ settings, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.json({ settings });
  }

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

  if (settings) userData.settings = settings;

  await db.doc(uid).set(userData, { merge: true });
  res.json(userData);
}));

// Register a new user profile (called after Firebase Auth signup)
router.post('/register', authenticateToken, catchAsync(async (req, res) => {
  const { username, phone } = req.body;
  const uid = req.user.uid;

  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  // Check username uniqueness
  const snapshot = await db.where('usernameLower', '==', username.trim().toLowerCase()).get();
  const isTaken = snapshot.docs.some(doc => doc.id !== uid);
  if (isTaken) return res.status(409).json({ error: 'Username taken' });

  const userData = {
    username: username.trim(),
    usernameLower: username.trim().toLowerCase(),
    displayName: username.trim(),
    email: req.user.email || '',
    phone: phone || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.doc(uid).set(userData, { merge: true });

  // Sync displayName to Firebase Auth
  try {
    await admin.auth().updateUser(uid, { displayName: username.trim() });
  } catch {
    /* Auth update is best-effort; Firestore is source of truth */
  }

  res.status(201).json(userData);
}));

// Update username
router.patch('/me/username', authenticateToken, catchAsync(async (req, res) => {
  const { username } = req.body;
  const uid = req.user.uid;

  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  // Check uniqueness
  const snapshot = await db.where('usernameLower', '==', username.trim().toLowerCase()).get();
  const isTaken = snapshot.docs.some(doc => doc.id !== uid);
  if (isTaken) return res.status(409).json({ error: 'Username taken' });

  const updates = {
    username: username.trim(),
    usernameLower: username.trim().toLowerCase(),
    displayName: username.trim(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.doc(uid).set(updates, { merge: true });

  // Sync displayName to Firebase Auth
  try {
    await admin.auth().updateUser(uid, { displayName: username.trim() });
  } catch {
    /* best-effort */
  }

  res.json(updates);
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
