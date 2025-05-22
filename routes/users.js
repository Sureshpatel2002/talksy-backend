const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Create or update user
router.post('/update', async (req, res) => {
  const { 
    uid, 
    name, 
    photoUrl, 
    email, 
    bio, 
    age, 
    gender, 
    fcmToken, 
    status, 
    isOnline, 
    lastSeen 
  } = req.body;
  
  try {
    const user = await User.findOneAndUpdate(
      { uid },
      { 
        $set: { 
          name, 
          photoUrl, 
          email, 
          bio, 
          age, 
          gender, 
          fcmToken, 
          status, 
          isOnline, 
          lastSeen: lastSeen ? new Date(lastSeen) : new Date()
        } 
      },
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user online status
router.put('/status/:uid', async (req, res) => {
  const { isOnline, status, lastSeen } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { 
        $set: { 
          isOnline, 
          status, 
          lastSeen: lastSeen ? new Date(lastSeen) : new Date()
        } 
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const searchQuery = req.params.query;
    const users = await User.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:uid', async (req, res) => {
  try {
    await User.findOneAndDelete({ uid: req.params.uid });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
