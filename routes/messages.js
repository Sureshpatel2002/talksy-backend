const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversation');

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { 
      conversationId, 
      senderId, 
      receiverId, 
      content, 
      type, 
      replyTo, 
      metadata 
    } = req.body;
    
    // Create new message
    const newMessage = new Message({
      conversationId,
      senderId,
      receiverId,
      content,
      type,
      replyTo,
      metadata,
      timestamp: new Date()
    });

    // Save message
    const savedMessage = await newMessage.save();

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: savedMessage._id
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
    })
    .populate('replyTo')
    .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark message as read
router.put('/read/:messageId', async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { 
        $set: { 
          isRead: true,
          readAt: new Date()
        } 
      },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all messages in conversation as read
router.put('/read-all/:conversationId', async (req, res) => {
  try {
    const { receiverId } = req.body;
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        receiverId,
        isRead: false
      },
      { 
        $set: { 
          isRead: true,
          readAt: new Date()
        } 
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit message
router.put('/:messageId', async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { 
        $set: { 
          content,
          isEdited: true
        } 
      },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 