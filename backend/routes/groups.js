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
    
    // Fetch user details for each member
    const memberPromises = groupData.members.map(memberId => 
      db.collection('users').doc(memberId).get()
    );
    
    const memberDocs = await Promise.all(memberPromises);
    const members = memberDocs.map(md => {
      return { id: md.id, ...md.data() };
    });
    
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

module.exports = router;
