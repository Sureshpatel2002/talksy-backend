import express from 'express';
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversation');

// Get messages for a conversation
router.get('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        // TODO: Add actual message fetching logic
        res.json({
            message: 'Get messages endpoint',
            conversationId
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Send a message
router.post('/', async (req, res) => {
    try {
        const { conversationId, content, type } = req.body;
        // TODO: Add actual message sending logic
        res.status(201).json({
            message: 'Message sent endpoint',
            conversationId,
            content,
            type
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Delete a message
router.delete('/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        // TODO: Add actual message deletion logic
        res.json({
            message: 'Message deletion endpoint',
            messageId
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
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

export default router; 