const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Conversation = require('../models/conversation');
const Message = require('../models/message');

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

// Get all users except current user with their last message
router.get('/all/:currentUserId', async (req, res) => {
  try {
    const { currentUserId } = req.params;

    // Get all users except current user
    const users = await User.find({ uid: { $ne: currentUserId } });

    // Get conversations and last messages for each user
    const usersWithLastMessage = await Promise.all(users.map(async (user) => {
      // Find conversation between current user and this user
      const conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, user.uid] }
      }).populate({
        path: 'lastMessage',
        populate: {
          path: 'replyTo'
        }
      });

      return {
        uid: user.uid,
        name: user.name,
        photoUrl: user.photoUrl,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        lastMessage: conversation?.lastMessage ? {
          id: conversation.lastMessage._id,
          content: conversation.lastMessage.content,
          type: conversation.lastMessage.type,
          timestamp: conversation.lastMessage.timestamp,
          isRead: conversation.lastMessage.isRead,
          senderId: conversation.lastMessage.senderId,
          receiverId: conversation.lastMessage.receiverId
        } : null
      };
    }));

    res.json(usersWithLastMessage);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
