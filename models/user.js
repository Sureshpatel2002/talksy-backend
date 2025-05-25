import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const commentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    mentions: [{
        type: String, // User IDs of mentioned users
        required: false
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'reaction',      // When someone reacts to your status
            'comment',       // When someone comments on your status
            'mention',       // When someone mentions you in a comment
            'message',       // When you receive a new message
            'status_view',   // When someone views your status
            'friend_request',// When someone sends you a friend request
            'friend_accept', // When someone accepts your friend request
            'group_invite',  // When you're invited to a group
            'group_message', // When there's a new message in your group
            'call_missed'    // When you miss a call
        ],
        required: true
    },
    fromUserId: {
        type: String,
        required: true
    },
    statusId: {
        type: String,
        required: false
    },
    messageId: {
        type: String,
        required: false
    },
    groupId: {
        type: String,
        required: false
    },
    commentId: {
        type: String,
        required: false
    },
    reactionType: {
        type: String,
        enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
        required: false
    },
    messagePreview: {
        type: String,
        required: false
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const notificationPreferencesSchema = new mongoose.Schema({
    email: {
        enabled: { type: Boolean, default: true },
        types: [{
            type: String,
            enum: [
                'message',
                'status_view',
                'friend_request',
                'friend_accept',
                'group_invite',
                'group_message',
                'call_missed'
            ]
        }]
    },
    push: {
        enabled: { type: Boolean, default: true },
        types: [{
            type: String,
            enum: [
                'message',
                'status_view',
                'friend_request',
                'friend_accept',
                'group_invite',
                'group_message',
                'call_missed'
            ]
        }]
    },
    inApp: {
        enabled: { type: Boolean, default: true },
        types: [{
            type: String,
            enum: [
                'message',
                'status_view',
                'friend_request',
                'friend_accept',
                'group_invite',
                'group_message',
                'call_missed'
            ]
        }]
    },
    sound: {
        enabled: { type: Boolean, default: true },
        volume: { type: Number, default: 0.7, min: 0, max: 1 }
    },
    badge: {
        enabled: { type: Boolean, default: true },
        showCount: { type: Boolean, default: true }
    }
});

const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    photoUrl: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: ''
    },
    // Contact Information
    phoneNumber: {
        type: String,
        default: null,
        validate: {
            validator: function(v) {
                return !v || /^\+?[\d\s-]{10,}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    countryCode: {
        type: String,
        default: null
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    // Social Media Links
    socialLinks: {
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String,
        website: String
    },
    // Additional Profile Information
    dateOfBirth: {
        type: Date,
        default: null
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        default: 'prefer_not_to_say'
    },
    language: {
        type: String,
        default: 'en'
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    // Privacy Settings
    privacySettings: {
        showPhoneNumber: {
            type: Boolean,
            default: false
        },
        showEmail: {
            type: Boolean,
            default: false
        },
        showAddress: {
            type: Boolean,
            default: false
        },
        showSocialLinks: {
            type: Boolean,
            default: false
        }
    },
    // Existing fields
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    friends: [{
        type: String
    }],
    status: {
        text: {
            type: String,
            default: null
        },
        mediaUrl: {
            type: String,
            default: null
        },
        mediaType: {
            type: String,
            enum: ['image', 'video', null],
            default: null
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        reactions: [reactionSchema],
        comments: [commentSchema],
        viewCount: {
            type: Number,
            default: 0
        },
        reactionCounts: {
            like: { type: Number, default: 0 },
            love: { type: Number, default: 0 },
            laugh: { type: Number, default: 0 },
            wow: { type: Number, default: 0 },
            sad: { type: Number, default: 0 },
            angry: { type: Number, default: 0 }
        }
    },
    notifications: [notificationSchema],
    notificationPreferences: {
        type: notificationPreferencesSchema,
        default: () => ({})
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

// Update lastSeen on user activity
userSchema.methods.updateLastSeen = async function() {
    this.lastSeen = new Date();
    await this.save();
};

// Update online status
userSchema.methods.updateOnlineStatus = async function(isOnline) {
    this.isOnline = isOnline;
    this.lastSeen = new Date();
    await this.save();
};

// Update user status
userSchema.methods.updateStatus = async function(statusData) {
    this.status = {
        ...this.status,
        ...statusData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        reactions: [],
        comments: [],
        viewCount: 0,
        reactionCounts: {
            like: 0,
            love: 0,
            laugh: 0,
            wow: 0,
            sad: 0,
            angry: 0
        }
    };
    await this.save();
};

// Add reaction to status
userSchema.methods.addReaction = async function(userId, reactionType) {
    if (!this.status) return false;
    
    // Remove existing reaction from this user if any
    const oldReaction = this.status.reactions.find(r => r.userId === userId);
    if (oldReaction) {
        this.status.reactionCounts[oldReaction.type]--;
        this.status.reactions = this.status.reactions.filter(r => r.userId !== userId);
    }
    
    // Add new reaction
    this.status.reactions.push({
        userId,
        type: reactionType
    });
    
    // Update reaction count
    this.status.reactionCounts[reactionType]++;
    
    await this.save();
    return true;
};

// Remove reaction from status
userSchema.methods.removeReaction = async function(userId) {
    if (!this.status) return false;
    
    const reaction = this.status.reactions.find(r => r.userId === userId);
    if (reaction) {
        this.status.reactionCounts[reaction.type]--;
        this.status.reactions = this.status.reactions.filter(r => r.userId !== userId);
        await this.save();
    }
    return true;
};

// Add comment to status
userSchema.methods.addComment = async function(userId, text, mentions = []) {
    if (!this.status) return false;
    
    this.status.comments.push({
        userId,
        text,
        mentions
    });
    
    await this.save();
    return true;
};

// Remove comment from status
userSchema.methods.removeComment = async function(commentId) {
    if (!this.status) return false;
    
    this.status.comments = this.status.comments.filter(c => c._id.toString() !== commentId);
    await this.save();
    return true;
};

// Increment view count
userSchema.methods.incrementViewCount = async function() {
    if (!this.status) return false;
    
    this.status.viewCount += 1;
    await this.save();
    return true;
};

// Add notification with more context
userSchema.methods.addNotification = async function(notificationData) {
    // Add notification with timestamp
    this.notifications.unshift({
        ...notificationData,
        createdAt: new Date()
    });
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
    }
    await this.save();
};

// Get unread notification count
userSchema.methods.getUnreadNotificationCount = function() {
    return this.notifications.filter(n => !n.isRead).length;
};

// Mark all notifications as read
userSchema.methods.markAllNotificationsAsRead = async function() {
    this.notifications = this.notifications.map(notification => {
        notification.isRead = true;
        return notification;
    });
    await this.save();
};

// Delete old notifications
userSchema.methods.cleanupOldNotifications = async function(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    this.notifications = this.notifications.filter(
        notification => notification.createdAt > cutoffDate
    );
    await this.save();
};

// Get paginated comments
userSchema.methods.getPaginatedComments = async function(page = 1, limit = 10) {
    if (!this.status) return { comments: [], total: 0, pages: 0 };
    
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = this.status.comments.length;
    
    return {
        comments: this.status.comments.slice(startIndex, endIndex),
        total,
        pages: Math.ceil(total / limit)
    };
};

// Add methods for notification preferences
userSchema.methods.updateNotificationPreferences = async function(preferences) {
    this.notificationPreferences = {
        ...this.notificationPreferences,
        ...preferences
    };
    await this.save();
};

userSchema.methods.isNotificationEnabled = function(type, channel = 'inApp') {
    const channelPrefs = this.notificationPreferences[channel];
    return channelPrefs?.enabled && channelPrefs.types.includes(type);
};

// Add friend
userSchema.methods.addFriend = async function(friendId) {
    if (!this.friends.includes(friendId)) {
        this.friends.push(friendId);
        await this.save();
    }
};

// Remove friend
userSchema.methods.removeFriend = async function(friendId) {
    this.friends = this.friends.filter(id => id !== friendId);
    await this.save();
};

// Update contact information
userSchema.methods.updateContactInfo = async function(contactData) {
    const allowedFields = [
        'phoneNumber', 'countryCode', 'address', 'socialLinks',
        'dateOfBirth', 'gender', 'language', 'timezone'
    ];

    allowedFields.forEach(field => {
        if (contactData[field] !== undefined) {
            this[field] = contactData[field];
        }
    });

    await this.save();
    return this;
};

// Update privacy settings
userSchema.methods.updatePrivacySettings = async function(settings) {
    Object.keys(settings).forEach(key => {
        if (this.privacySettings[key] !== undefined) {
            this.privacySettings[key] = settings[key];
        }
    });

    await this.save();
    return this;
};

// Get public profile
userSchema.methods.getPublicProfile = function() {
    const publicProfile = {
        uid: this.uid,
        displayName: this.displayName,
        photoUrl: this.photoUrl,
        bio: this.bio,
        isOnline: this.isOnline,
        lastSeen: this.lastSeen
    };

    // Add contact information based on privacy settings
    if (this.privacySettings.showPhoneNumber && this.phoneNumber) {
        publicProfile.phoneNumber = this.phoneNumber;
    }
    if (this.privacySettings.showEmail && this.email) {
        publicProfile.email = this.email;
    }
    if (this.privacySettings.showAddress && this.address) {
        publicProfile.address = this.address;
    }
    if (this.privacySettings.showSocialLinks && this.socialLinks) {
        publicProfile.socialLinks = this.socialLinks;
    }

    return publicProfile;
};

const User = mongoose.model('User', userSchema);

export default User;
