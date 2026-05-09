const express = require('express');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const db = admin.firestore();

// Get all groups for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const groupsRef = db.collection('groups');
    const snapshot = await groupsRef.where('members', 'array-contains', uid).get();
    
    const groups = [];
    snapshot.forEach(doc => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const uid = req.user.uid;
    
    if (!name) return res.status(400).json({ error: 'Group name required' });

    const newGroup = {
      name,
      created_by: uid,
      members: [uid] // add creator as member initially
    };

    const docRef = await db.collection('groups').add(newGroup);
    res.status(201).json({ id: docRef.id, ...newGroup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get group details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const doc = await db.collection('groups').doc(groupId).get();
    
    if (!doc.exists) return res.status(404).json({ error: 'Group not found' });
    
    const groupData = doc.data();
    if (!groupData.members.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    res.json({ id: doc.id, ...groupData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get group members (resolving user details)
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const doc = await db.collection('groups').doc(groupId).get();
    
    if (!doc.exists) return res.status(404).json({ error: 'Group not found' });
    
    const groupData = doc.data();
    if (!groupData.members.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Fetch user details for each member and always populate displayName.
    const members = await Promise.all(
      groupData.members.map(async (memberId) => {
        const userDoc = await db.collection('users').doc(memberId).get();
        const docData = userDoc.exists ? userDoc.data() : {};
        const username = typeof docData.username === 'string' ? docData.username.trim() : '';
        const existingDisplayName = typeof docData.displayName === 'string' ? docData.displayName.trim() : '';
        const email = typeof docData.email === 'string' ? docData.email : '';

        if (existingDisplayName || username) {
          return {
            id: memberId,
            ...docData,
            displayName: existingDisplayName || username,
          };
        }

        try {
          const authUser = await admin.auth().getUser(memberId);
          const authDisplayName = (authUser.displayName || '').trim();
          return {
            id: memberId,
            ...docData,
            displayName: authDisplayName || username || (authUser.email || email || ''),
            email: email || authUser.email || '',
          };
        } catch {
          return {
            id: memberId,
            ...docData,
            displayName: existingDisplayName || username || email || '',
          };
        }
      })
    );
    
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add user to group
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;
    const uid = req.user.uid;

    const groupRef = db.collection('groups').doc(groupId);
    const doc = await groupRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: 'Group not found' });
    
    const groupData = doc.data();
    if (!groupData.members.includes(uid)) {
      return res.status(403).json({ error: 'Not authorized to add members to this group' });
    }

    if (groupData.members.includes(userId)) {
      return res.status(400).json({ error: 'User already in group' });
    }

    await groupRef.update({
      members: admin.firestore.FieldValue.arrayUnion(userId)
    });
    
    res.status(201).json({ message: 'User added to group' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all expenses/activity for a group
router.get('/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const groupData = groupDoc.data();
    if (!groupData.members.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const snapshot = await groupRef.collection('expenses').orderBy('createdAt', 'desc').get();
    const expenses = [];
    snapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() });
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an expense to a group (creates activity item)
router.post('/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { amount, purpose, paidBy, splitBetween } = req.body;
    const numericAmount = Number(amount);
    const cleanPurpose = typeof purpose === 'string' ? purpose.trim() : '';

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    if (!cleanPurpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }

    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    const groupData = groupDoc.data();
    if (!groupData.members.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const members = Array.isArray(groupData.members) ? groupData.members : [];
    let paidByUid = typeof paidBy === 'string' && paidBy.trim() ? paidBy.trim() : req.user.uid;
    if (!members.includes(paidByUid)) {
      return res.status(400).json({ error: 'Payer must be a member of this group' });
    }

    let splitIds = [];
    if (Array.isArray(splitBetween)) {
      splitIds = [...new Set(splitBetween.filter((id) => typeof id === 'string' && id.trim()))].map((id) => id.trim());
    }
    if (splitIds.length === 0) {
      return res.status(400).json({ error: 'Choose at least one person to split this expense with' });
    }
    const invalidSplit = splitIds.find((id) => !members.includes(id));
    if (invalidSplit) {
      return res.status(400).json({ error: 'Split list must only include group members' });
    }

    const expense = {
      amount: Number(numericAmount.toFixed(2)),
      purpose: cleanPurpose,
      addedBy: req.user.uid,
      paidBy: paidByUid,
      splitBetween: splitIds,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await groupRef.collection('expenses').add(expense);
    res.status(201).json({
      id: docRef.id,
      amount: expense.amount,
      purpose: expense.purpose,
      addedBy: expense.addedBy,
      paidBy: expense.paidBy,
      splitBetween: splitIds,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
