import express from 'express';
import { conversationService, messageService } from '../services/s3Service.js';

const router = express.Router();

// Create new conversation
router.post('/', async (req, res) => {
    try {
        const { participants } = req.body;
        const conversation = await conversationService.createConversation(participants);
        res.status(201).json({
            status: 'success',
            data: conversation
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get conversation
router.get('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await conversationService.getConversation(conversationId);
        
        if (!conversation) {
            return res.status(404).json({
                status: 'error',
                message: 'Conversation not found'
            });
        }

        res.json({
            status: 'success',
            data: conversation
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Send message
router.post('/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, type = 'text', mediaUrl = null, replyTo = null } = req.body;
        const senderId = req.user.userId;

        const message = await messageService.createMessage(
            conversationId, 
            senderId, 
            content, 
            type,
            mediaUrl,
            replyTo
        );

        await conversationService.updateLastMessage(conversationId, {
            messageId: message.messageId,
            content: message.content,
            type: message.type,
            senderId: message.senderId,
            timestamp: message.timestamp
        });

        res.status(201).json({
            status: 'success',
            data: message
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get messages with pagination
router.get('/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, lastEvaluatedKey } = req.query;
        
        const result = await messageService.getMessages(
            conversationId,
            parseInt(limit),
            lastEvaluatedKey
        );

        res.json({
            status: 'success',
            data: result.messages,
            lastEvaluatedKey: result.lastEvaluatedKey
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Edit message
router.put('/:conversationId/messages/:messageId', async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const { content } = req.body;
        
        const message = await messageService.editMessage(messageId, conversationId, content);
        res.json({
            status: 'success',
            data: message
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Add reaction to message
router.post('/:conversationId/messages/:messageId/reactions', async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const { reaction } = req.body;
        const userId = req.user.userId;
        
        const message = await messageService.addReaction(messageId, conversationId, userId, reaction);
        res.json({
            status: 'success',
            data: message
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Remove reaction from message
router.delete('/:conversationId/messages/:messageId/reactions', async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const userId = req.user.userId;
        
        const message = await messageService.removeReaction(messageId, conversationId, userId);
        res.json({
            status: 'success',
            data: message
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update message status
router.put('/:conversationId/messages/:messageId/status', async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const { status } = req.body;
        
        const message = await messageService.updateMessageStatus(messageId, conversationId, status);
        res.json({
            status: 'success',
            data: message
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router; 