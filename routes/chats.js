const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const User = require('../models/user');
const Message = require('../models/message');

// Get recent chats for a user
router.get('/recent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get all conversations for the user
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'replyTo'
      }
    })
    .sort({ updatedAt: -1 });

    // Get recent chats with user details and last message
    const recentChats = await Promise.all(conversations.map(async (conversation) => {
      // Get the other participant's ID
      const otherParticipantId = conversation.participants.find(id => id !== userId);
      
      // Get the other participant's details
      const user = await User.findOne({ uid: otherParticipantId });
      
      // Get unread count for this conversation
      const unreadCount = await Message.countDocuments({
        conversationId: conversation._id,
        receiverId: userId,
        isRead: false
      });

      return {
        user: {
          uid: user.uid,
          name: user.name,
          photoUrl: user.photoUrl,
          email: user.email,
          bio: user.bio,
          age: user.age,
          gender: user.gender,
          status: user.status,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen
        },
        lastMessage: conversation.lastMessage ? {
          id: conversation.lastMessage._id,
          senderId: conversation.lastMessage.senderId,
          receiverId: conversation.lastMessage.receiverId,
          content: conversation.lastMessage.content,
          type: conversation.lastMessage.type,
          timestamp: conversation.lastMessage.timestamp,
          isEdited: conversation.lastMessage.isEdited,
          replyTo: conversation.lastMessage.replyTo,
          metadata: conversation.lastMessage.metadata,
          isRead: conversation.lastMessage.isRead,
          readAt: conversation.lastMessage.readAt
        } : null,
        unreadCount
      };
    }));

    res.json(recentChats);
  } catch (err) {
    console.error('Error fetching recent chats:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 