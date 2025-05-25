import express from 'express';
import Conversation from '../models/conversation.js';
import Message from '../models/message.js';

const router = express.Router();

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
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Add actual conversation fetching logic
        res.json({
            message: 'Get conversations endpoint',
            userId
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Create a new conversation
router.post('/', async (req, res) => {
    try {
        const { participants, type, name } = req.body;
        // TODO: Add actual conversation creation logic
        res.status(201).json({
            message: 'Create conversation endpoint',
            participants,
            type,
            name
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Update conversation
router.put('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const updates = req.body;
        // TODO: Add actual conversation update logic
        res.json({
            message: 'Update conversation endpoint',
            conversationId,
            updates
        });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Delete conversation
router.delete('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        // TODO: Add actual conversation deletion logic
        res.json({
            message: 'Delete conversation endpoint',
            conversationId
        });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router; 