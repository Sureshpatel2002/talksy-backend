import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    emoji: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const messageSchema = new mongoose.Schema({
    senderId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file'],
        default: 'text'
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    reactions: [reactionSchema],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['direct', 'group'],
        required: true
    },
    name: {
        type: String,
        required: function() {
            return this.type === 'group';
        }
    },
    participants: [{
        type: String, // User IDs
        required: true
    }],
    admin: {
        type: String, // User ID of group admin
        required: function() {
            return this.type === 'group';
        }
    },
    messages: [messageSchema],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map()
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add message to chat
chatSchema.methods.addMessage = async function(messageData) {
    const message = {
        ...messageData,
        timestamp: new Date()
    };
    
    this.messages.push(message);
    this.lastMessage = this.messages[this.messages.length - 1]._id;
    this.updatedAt = new Date();

    // Update unread counts for all participants except sender
    this.participants.forEach(participantId => {
        if (participantId !== messageData.senderId) {
            const currentCount = this.unreadCounts.get(participantId) || 0;
            this.unreadCounts.set(participantId, currentCount + 1);
        }
    });

    await this.save();
    return message;
};

// Mark messages as read
chatSchema.methods.markAsRead = async function(userId) {
    this.messages.forEach(message => {
        if (!message.isRead && message.senderId !== userId) {
            message.isRead = true;
            message.readAt = new Date();
        }
    });

    this.unreadCounts.set(userId, 0);
    await this.save();
};

// Get unread count for user
chatSchema.methods.getUnreadCount = function(userId) {
    return this.unreadCounts.get(userId) || 0;
};

// Get recent messages
chatSchema.methods.getRecentMessages = function(limit = 50) {
    return this.messages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
};

// Add reaction to message
chatSchema.methods.addReaction = async function(messageId, userId, emoji) {
    const message = this.messages.id(messageId);
    if (!message) {
        throw new Error('Message not found');
    }

    // Remove existing reaction from same user if any
    message.reactions = message.reactions.filter(r => r.userId !== userId);
    
    // Add new reaction
    message.reactions.push({ userId, emoji });
    await this.save();
    return message;
};

// Remove reaction from message
chatSchema.methods.removeReaction = async function(messageId, userId) {
    const message = this.messages.id(messageId);
    if (!message) {
        throw new Error('Message not found');
    }

    message.reactions = message.reactions.filter(r => r.userId !== userId);
    await this.save();
    return message;
};

// Edit message
chatSchema.methods.editMessage = async function(messageId, userId, newContent) {
    const message = this.messages.id(messageId);
    if (!message) {
        throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
        throw new Error('Only message sender can edit the message');
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    await this.save();
    return message;
};

// Delete message
chatSchema.methods.deleteMessage = async function(messageId, userId) {
    const message = this.messages.id(messageId);
    if (!message) {
        throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
        throw new Error('Only message sender can delete the message');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await this.save();
    return message;
};

// Search messages
chatSchema.methods.searchMessages = function(query, options = {}) {
    const { limit = 50, before, after } = options;
    
    let messages = this.messages.filter(msg => {
        if (msg.isDeleted) return false;
        if (before && msg.timestamp >= new Date(before)) return false;
        if (after && msg.timestamp <= new Date(after)) return false;
        return msg.content.toLowerCase().includes(query.toLowerCase());
    });

    return messages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat; 