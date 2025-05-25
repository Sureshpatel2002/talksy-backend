import express from 'express';
import Chat from '../models/chat.js';
import User from '../models/user.js';
import { getIO } from '../socket.js';

const router = express.Router();

// Create a new chat (direct or group)
router.post('/', async (req, res) => {
    try {
        const { type, participants, name } = req.body;
        
        // Validate participants
        if (!participants || participants.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'At least 2 participants are required',
                code: 'INVALID_PARTICIPANTS'
            });
        }

        // For group chats, validate name
        if (type === 'group' && !name) {
            return res.status(400).json({
                success: false,
                message: 'Group name is required',
                code: 'NAME_REQUIRED'
            });
        }

        // Check if direct chat already exists
        if (type === 'direct') {
            const existingChat = await Chat.findOne({
                type: 'direct',
                participants: { $all: participants }
            });

            if (existingChat) {
                return res.status(200).json({
                    success: true,
                    message: 'Chat already exists',
                    chat: existingChat
                });
            }
        }

        const chat = new Chat({
            type,
            participants,
            name: type === 'group' ? name : undefined,
            admin: type === 'group' ? participants[0] : undefined
        });

        await chat.save();

        // Notify participants about new chat
        participants.forEach(participantId => {
            getIO().to(participantId).emit('chat:new', {
                chatId: chat._id,
                type: chat.type,
                name: chat.name,
                participants: chat.participants
            });
        });

        res.status(201).json({
            success: true,
            message: 'Chat created successfully',
            chat
        });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating chat',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Send message in chat
router.post('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { senderId, content, type = 'text', metadata = {} } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        // Validate sender is participant
        if (!chat.participants.includes(senderId)) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this chat',
                code: 'NOT_PARTICIPANT'
            });
        }

        const message = await chat.addMessage({
            senderId,
            content,
            type,
            metadata
        });

        // Notify participants about new message
        chat.participants.forEach(participantId => {
            if (participantId !== senderId) {
                getIO().to(participantId).emit('chat:message', {
                    chatId,
                    message
                });
            }
        });

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Get chat messages
router.get('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, before } = req.query;
        const userId = req.query.userId; // For marking messages as read

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        // Validate user is participant
        if (!chat.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this chat',
                code: 'NOT_PARTICIPANT'
            });
        }

        let messages = chat.messages;
        
        // Filter messages before timestamp if provided
        if (before) {
            messages = messages.filter(msg => msg.timestamp < new Date(before));
        }

        // Sort and limit messages
        messages = messages
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, parseInt(limit));

        // Mark messages as read if userId provided
        if (userId) {
            await chat.markAsRead(userId);
        }

        res.status(200).json({
            success: true,
            messages,
            unreadCount: chat.getUnreadCount(userId)
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting messages',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Get user's chats
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.query;

        const query = { participants: userId };
        if (type) {
            query.type = type;
        }

        const chats = await Chat.find(query)
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            chats
        });
    } catch (error) {
        console.error('Error getting user chats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting user chats',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Update chat (group name, participants)
router.put('/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { name, participants, admin } = req.body;
        const userId = req.body.userId; // User making the update

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        // Validate user is admin for group chats
        if (chat.type === 'group' && chat.admin !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can update chat',
                code: 'NOT_ADMIN'
            });
        }

        // Update chat fields
        if (name && chat.type === 'group') {
            chat.name = name;
        }
        if (participants) {
            chat.participants = participants;
        }
        if (admin && chat.type === 'group') {
            chat.admin = admin;
        }

        await chat.save();

        // Notify participants about chat update
        chat.participants.forEach(participantId => {
            getIO().to(participantId).emit('chat:update', {
                chatId,
                updates: {
                    name: chat.name,
                    participants: chat.participants,
                    admin: chat.admin
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Chat updated successfully',
            chat
        });
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating chat',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Add reaction to message
router.post('/:chatId/messages/:messageId/reactions', async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { userId, emoji } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        const message = await chat.addReaction(messageId, userId, emoji);

        // Notify participants about reaction
        chat.participants.forEach(participantId => {
            if (participantId !== userId) {
                getIO().to(participantId).emit('chat:reaction', {
                    chatId,
                    messageId,
                    reaction: {
                        userId,
                        emoji
                    }
                });
            }
        });

        res.status(200).json({
            success: true,
            message: 'Reaction added successfully',
            reactions: message.reactions
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding reaction',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Remove reaction from message
router.delete('/:chatId/messages/:messageId/reactions', async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { userId } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        const message = await chat.removeReaction(messageId, userId);

        // Notify participants about reaction removal
        chat.participants.forEach(participantId => {
            if (participantId !== userId) {
                getIO().to(participantId).emit('chat:reaction:removed', {
                    chatId,
                    messageId,
                    userId
                });
            }
        });

        res.status(200).json({
            success: true,
            message: 'Reaction removed successfully',
            reactions: message.reactions
        });
    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing reaction',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Edit message
router.put('/:chatId/messages/:messageId', async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { userId, content } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        const message = await chat.editMessage(messageId, userId, content);

        // Notify participants about message edit
        chat.participants.forEach(participantId => {
            if (participantId !== userId) {
                getIO().to(participantId).emit('chat:message:edited', {
                    chatId,
                    messageId,
                    content,
                    editedAt: message.editedAt
                });
            }
        });

        res.status(200).json({
            success: true,
            message: 'Message edited successfully',
            message
        });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({
            success: false,
            message: 'Error editing message',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Delete message
router.delete('/:chatId/messages/:messageId', async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { userId } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        const message = await chat.deleteMessage(messageId, userId);

        // Notify participants about message deletion
        chat.participants.forEach(participantId => {
            if (participantId !== userId) {
                getIO().to(participantId).emit('chat:message:deleted', {
                    chatId,
                    messageId
                });
            }
        });

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting message',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Search messages
router.get('/:chatId/search', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { query, limit, before, after } = req.query;
        const userId = req.query.userId;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found',
                code: 'CHAT_NOT_FOUND'
            });
        }

        // Validate user is participant
        if (!chat.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this chat',
                code: 'NOT_PARTICIPANT'
            });
        }

        const messages = chat.searchMessages(query, {
            limit: parseInt(limit) || 50,
            before,
            after
        });

        res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching messages',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Get chat history
router.get('/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        // TODO: Add actual chat history fetching logic
        res.json({
            message: 'Get chat history endpoint',
            chatId
        });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Send chat message
router.post('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content, type } = req.body;
        // TODO: Add actual message sending logic
        res.status(201).json({
            message: 'Send chat message endpoint',
            chatId,
            content,
            type
        });
    } catch (error) {
        console.error('Send chat message error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Update chat settings
router.put('/:chatId/settings', async (req, res) => {
    try {
        const { chatId } = req.params;
        const settings = req.body;
        // TODO: Add actual chat settings update logic
        res.json({
            message: 'Update chat settings endpoint',
            chatId,
            settings
        });
    } catch (error) {
        console.error('Update chat settings error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router; 