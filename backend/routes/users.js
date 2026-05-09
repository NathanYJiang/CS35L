const express = require('express');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const db = admin.firestore();
const normalizeUsername = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Current user's Firestore profile (username, phone, etc.)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.json({
        id: uid,
        username: '',
        email: req.user.email || '',
        phone: '',
      });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register user in Firestore (Called by frontend after Firebase Auth signup)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, phone } = req.body;
    const uid = req.user.uid;
    const email = req.user.email;
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    const usernameLower = normalizeUsername(cleanUsername);

    if (!cleanUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const takenSnap = await db.collection('users')
      .where('usernameLower', '==', usernameLower)
      .limit(1)
      .get();
    const taken = takenSnap.docs.find((d) => d.id !== uid);
    if (taken) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      username: cleanUsername,
      displayName: cleanUsername,
      usernameLower,
      email: email,
      phone: phone || '',
      friends: []
    });

    try {
      await admin.auth().updateUser(uid, { displayName: cleanUsername });
    } catch {
      // Firestore still has source of truth for display name.
    }

    res.status(201).json({ message: 'User profile created in Firestore' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update current user's username (must be globally unique)
router.patch('/me/username', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const cleanUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const usernameLower = normalizeUsername(cleanUsername);
    if (!cleanUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const takenSnap = await db.collection('users')
      .where('usernameLower', '==', usernameLower)
      .limit(1)
      .get();
    const taken = takenSnap.docs.find((d) => d.id !== uid);
    if (taken) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const userRef = db.collection('users').doc(uid);
    await userRef.set(
      {
        username: cleanUsername,
        displayName: cleanUsername,
        usernameLower,
      },
      { merge: true }
    );

    try {
      await admin.auth().updateUser(uid, { displayName: cleanUsername });
    } catch {
      // Keep going: Firestore update succeeded and UI reads from it.
    }

    res.json({ message: 'Username updated', username: cleanUsername, displayName: cleanUsername });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users by username (simple prefix search in Firestore)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    // Firestore prefix search
    const snapshot = await db.collection('users')
      .where('username', '>=', query)
      .where('username', '<=', query + '\uf8ff')
      .limit(10)
      .get();
      
    const users = [];
    snapshot.forEach(doc => {
      if (doc.id !== req.user.uid) {
        users.push({ id: doc.id, ...doc.data() });
      }
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
