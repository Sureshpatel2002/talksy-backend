import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Generate pre-signed URL for upload
export const getPresignedUrl = async (type, fileName, contentType, userId) => {
    try {
        let key;
        switch (type) {
            case 'profile':
                key = `uploads/profile/${userId}/${fileName}`;
                break;
            case 'message':
                key = `uploads/messages/${userId}/${fileName}`;
                break;
            case 'status':
                key = `uploads/status/${userId}/${fileName}`;
                break;
            default:
                throw new Error('Invalid media type');
        }

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            ContentType: contentType,
            ACL: 'public-read'
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour

        return {
            url,
            key,
            expiresIn: 3600
        };
    } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        throw error;
    }
};

// Helper function to get JSON data from S3
const getJsonData = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key
        });
        const response = await s3Client.send(command);
        const str = await response.Body.transformToString();
        return JSON.parse(str);
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return null;
        }
        throw error;
    }
};

// Helper function to save JSON data to S3
const saveJsonData = async (key, data) => {
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: 'application/json'
    });
    await s3Client.send(command);
};

// User related functions
export const userService = {
    async createUser(userData) {
        const users = await getJsonData('users.json') || [];
        const existingUser = users.find(u => u.phone === userData.phone);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const newUser = {
            uid: crypto.randomUUID(),
            displayName: userData.name,
            email: userData.email,
            photoUrl: userData.profilePicture,
            bio: userData.bio || '',
            age: userData.age,
            gender: userData.gender,
            status: userData.status || 'Hey there! I am using WhatsApp',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            notificationSettings: {
                pushEnabled: true,
                emailEnabled: true,
                soundEnabled: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deviceTokens: []
        };

        users.push(newUser);
        await saveJsonData('users.json', users);
        return newUser;
    },

    async getUser(userId) {
        const users = await getJsonData('users.json') || [];
        return users.find(u => u.uid === userId);
    },

    async updateUser(userId, updates) {
        const users = await getJsonData('users.json') || [];
        const index = users.findIndex(u => u.uid === userId);
        if (index === -1) {
            throw new Error('User not found');
        }
        users[index] = { 
            ...users[index], 
            ...updates,
            updatedAt: new Date().toISOString()
        };
        await saveJsonData('users.json', users);
        return users[index];
    },

    async updateNotificationSettings(userId, settings) {
        const users = await getJsonData('users.json') || [];
        const index = users.findIndex(u => u.uid === userId);
        if (index === -1) {
            throw new Error('User not found');
        }
        users[index].notificationSettings = {
            ...users[index].notificationSettings,
            ...settings
        };
        users[index].updatedAt = new Date().toISOString();
        await saveJsonData('users.json', users);
        return users[index];
    },

    async addDeviceToken(userId, token) {
        const users = await getJsonData('users.json') || [];
        const index = users.findIndex(u => u.uid === userId);
        if (index === -1) {
            throw new Error('User not found');
        }
        if (!users[index].deviceTokens.includes(token)) {
            users[index].deviceTokens.push(token);
            users[index].updatedAt = new Date().toISOString();
            await saveJsonData('users.json', users);
        }
        return users[index];
    },

    async removeDeviceToken(userId, token) {
        const users = await getJsonData('users.json') || [];
        const index = users.findIndex(u => u.uid === userId);
        if (index === -1) {
            throw new Error('User not found');
        }
        users[index].deviceTokens = users[index].deviceTokens.filter(t => t !== token);
        users[index].updatedAt = new Date().toISOString();
        await saveJsonData('users.json', users);
        return users[index];
    }
};

// Status related functions
export const statusService = {
    async createStatus(userId, statusData) {
        const statuses = await getJsonData('statuses.json') || [];
        const status = { 
            ...statusData, 
            userId, 
            createdAt: new Date().toISOString() 
        };
        statuses.push(status);
        await saveJsonData('statuses.json', statuses);

        // Send notifications to followers
        await notificationService.sendStatusNotification(userId, status);

        return status;
    },

    async getUserStatuses(userId) {
        const statuses = await getJsonData('statuses.json') || [];
        return statuses.filter(s => s.userId === userId);
    },

    async deleteStatus(statusId) {
        const statuses = await getJsonData('statuses.json') || [];
        const filteredStatuses = statuses.filter(s => s.id !== statusId);
        await saveJsonData('statuses.json', filteredStatuses);
    }
};

// Conversation related functions
export const conversationService = {
    async createConversation(participants) {
        const conversations = await getJsonData('conversations.json') || [];
        const conversation = {
            id: crypto.randomUUID(),
            participants,
            lastMessage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        conversations.push(conversation);
        await saveJsonData('conversations.json', conversations);
        return conversation;
    },

    async getConversation(conversationId) {
        const conversations = await getJsonData('conversations.json') || [];
        return conversations.find(c => c.id === conversationId);
    },

    async updateLastMessage(conversationId, message) {
        const conversations = await getJsonData('conversations.json') || [];
        const index = conversations.findIndex(c => c.id === conversationId);
        if (index === -1) {
            throw new Error('Conversation not found');
        }
        conversations[index].lastMessage = message;
        conversations[index].updatedAt = new Date().toISOString();
        await saveJsonData('conversations.json', conversations);
        return conversations[index];
    }
};

// Message related functions
export const messageService = {
    async createMessage(conversationId, senderId, content, type = 'text', mediaUrl = null, replyTo = null) {
        const messages = await getJsonData(`messages/${conversationId}.json`) || [];
        const message = {
            messageId: crypto.randomUUID(),
            conversationId,
            senderId,
            content,
            type,
            mediaUrl,
            isRead: false,
            isDelivered: false,
            isEdited: false,
            timestamp: new Date().toISOString(),
            replyTo,
            reactions: {}
        };
        messages.push(message);
        await saveJsonData(`messages/${conversationId}.json`, messages);

        // Get conversation participants and send notifications
        const conversation = await conversationService.getConversation(conversationId);
        if (conversation) {
            const notificationPromises = conversation.participants
                .filter(participantId => participantId !== senderId)
                .map(participantId => 
                    notificationService.sendMessageNotification(senderId, participantId, message)
                );
            await Promise.all(notificationPromises);
        }

        return message;
    },

    async getMessages(conversationId, limit = 50, lastEvaluatedKey = null) {
        const messages = await getJsonData(`messages/${conversationId}.json`) || [];
        const sortedMessages = messages.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        let startIndex = 0;
        if (lastEvaluatedKey) {
            startIndex = sortedMessages.findIndex(m => m.messageId === lastEvaluatedKey) + 1;
        }

        const paginatedMessages = sortedMessages.slice(startIndex, startIndex + limit);
        const nextKey = startIndex + limit < sortedMessages.length ? 
            sortedMessages[startIndex + limit - 1].messageId : null;

        return {
            messages: paginatedMessages,
            lastEvaluatedKey: nextKey
        };
    },

    async updateMessageStatus(messageId, conversationId, status) {
        const messages = await getJsonData(`messages/${conversationId}.json`) || [];
        const index = messages.findIndex(m => m.messageId === messageId);
        if (index === -1) {
            throw new Error('Message not found');
        }

        if (status === 'read') {
            messages[index].isRead = true;
        } else if (status === 'delivered') {
            messages[index].isDelivered = true;
        }

        await saveJsonData(`messages/${conversationId}.json`, messages);
        return messages[index];
    },

    async editMessage(messageId, conversationId, newContent) {
        const messages = await getJsonData(`messages/${conversationId}.json`) || [];
        const index = messages.findIndex(m => m.messageId === messageId);
        if (index === -1) {
            throw new Error('Message not found');
        }

        messages[index].content = newContent;
        messages[index].isEdited = true;
        messages[index].editedAt = new Date().toISOString();

        await saveJsonData(`messages/${conversationId}.json`, messages);
        return messages[index];
    },

    async addReaction(messageId, conversationId, userId, reaction) {
        const messages = await getJsonData(`messages/${conversationId}.json`) || [];
        const index = messages.findIndex(m => m.messageId === messageId);
        if (index === -1) {
            throw new Error('Message not found');
        }

        messages[index].reactions[userId] = reaction;
        await saveJsonData(`messages/${conversationId}.json`, messages);
        return messages[index];
    },

    async removeReaction(messageId, conversationId, userId) {
        const messages = await getJsonData(`messages/${conversationId}.json`) || [];
        const index = messages.findIndex(m => m.messageId === messageId);
        if (index === -1) {
            throw new Error('Message not found');
        }

        delete messages[index].reactions[userId];
        await saveJsonData(`messages/${conversationId}.json`, messages);
        return messages[index];
    }
};

// File upload function
export const uploadFile = async (file, folder = 'uploads') => {
    const fileExtension = file.originalname.split('.').pop();
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        }
    });

    await upload.done();
    return {
        url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        key
    };
}; 