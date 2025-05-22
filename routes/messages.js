const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversation');

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { conversationId, senderId, receiverId, text, mediaUrl, mediaType } = req.body;
    
    // Create new message
    const newMessage = new Message({
      conversationId,
      senderId,
      receiverId,
      text,
      mediaUrl,
      mediaType
    });

    // Save message
    const savedMessage = await newMessage.save();

    // Update conversation's last message and unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: savedMessage._id,
      $inc: { [`unreadCount.${receiverId}`]: 1 }
    });

    res.json(savedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a conversation
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
router.put('/read/:conversationId', async (req, res) => {
  try {
    const { userId } = req.body;
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        receiverId: userId,
        read: false
      },
      { read: true }
    );

    // Reset unread count
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      [`unreadCount.${userId}`]: 0
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 