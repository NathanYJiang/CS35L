const express = require('express');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const db = admin.firestore();

// Register user in Firestore (Called by frontend after Firebase Auth signup)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, phone } = req.body;
    const uid = req.user.uid;
    const email = req.user.email;

    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      username: username || '',
      email: email,
      phone: phone || '',
      friends: []
    });

    res.status(201).json({ message: 'User profile created in Firestore' });
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
