const express = require('express');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const db = admin.firestore();

// MIDDLEWARE: Verifies group exists and user is a member
const checkMembership = async (req, res, next) => {
  const groupDoc = await db.collection('groups').doc(req.params.id).get();
  if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
  
  const data = groupDoc.data();
  if (!data.members.includes(req.user.uid)) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  req.groupData = data; // Pass data to the next function to save a DB call
  next();
};

// --- ROUTES ---

// Get all groups for user
router.get('/', authenticateToken, async (req, res) => {
  const snapshot = await db.collection('groups').where('members', 'array-contains', req.user.uid).get();
  const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(groups);
});

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name required' });

  const newGroup = { name, created_by: req.user.uid, members: [req.user.uid] };
  const doc = await db.collection('groups').add(newGroup);
  res.status(201).json({ id: doc.id, ...newGroup });
});

// Get group details
router.get('/:id', authenticateToken, checkMembership, (req, res) => {
  res.json({ id: req.params.id, ...req.groupData });
});

// Get group members (simplified resolving)
router.get('/:id/members', authenticateToken, checkMembership, async (req, res) => {
  const memberPromises = req.groupData.members.map(async (uid) => {
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    return {
      id: uid,
      displayName: userData.displayName || userData.username || 'Unknown User',
      email: userData.email || ''
    };
  });

  const members = await Promise.all(memberPromises);
  res.json(members);
});

// Add user to group
router.post('/:id/members', authenticateToken, checkMembership, async (req, res) => {
  const { userId } = req.body;
  if (req.groupData.members.includes(userId)) return res.status(400).json({ error: 'Already a member' });

  await db.collection('groups').doc(req.params.id).update({
    members: admin.firestore.FieldValue.arrayUnion(userId)
  });
  res.status(201).json({ message: 'User added' });
});

// Get expenses
router.get('/:id/expenses', authenticateToken, checkMembership, async (req, res) => {
  const snap = await db.collection('groups').doc(req.params.id).collection('expenses').orderBy('createdAt', 'desc').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

// Add expense
router.post('/:id/expenses', authenticateToken, checkMembership, async (req, res) => {
  const { amount, purpose, paidBy, splitBetween } = req.body;
  
  if (!amount || !purpose || !splitBetween?.length) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  const expense = {
    amount: Number(amount),
    purpose,
    addedBy: req.user.uid,
    paidBy: paidBy || req.user.uid,
    splitBetween,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const doc = await db.collection('groups').doc(req.params.id).collection('expenses').add(expense);
  res.status(201).json({ id: doc.id, ...expense });
});

// Delete expense
router.delete('/:id/expenses/:expenseId', authenticateToken, async (req, res) => {
  const expenseRef = db.collection('groups').doc(req.params.id).collection('expenses').doc(req.params.expenseId);
  const doc = await expenseRef.get();

  if (!doc.exists) return res.status(404).json({ error: 'Not found' });
  if (doc.data().addedBy !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });

  await expenseRef.delete();
  res.json({ message: 'Deleted' });
});

module.exports = router;
