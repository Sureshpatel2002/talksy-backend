const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const Message = require('../models/message');

// Create or get conversation between two users
router.post('/get', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2] }
    });

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [userId1, userId2],
        unreadCount: new Map([[userId1, 0], [userId2, 0]])
      });
      await conversation.save();
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all conversations for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.userId
    })
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a conversation
router.delete('/:conversationId', async (req, res) => {
  try {
    // Delete all messages in the conversation
    await Message.deleteMany({
      conversationId: req.params.conversationId
    });

    // Delete the conversation
    await Conversation.findByIdAndDelete(req.params.conversationId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 