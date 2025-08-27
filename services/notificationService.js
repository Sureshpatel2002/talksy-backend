import admin from 'firebase-admin';
import fs from 'fs';
import { userService } from './userService.js';
import { conversationService } from './conversationService.js';

// Read service account from file
const serviceAccount = JSON.parse(fs.readFileSync('talksy-fe0a6-firebase-adminsdk-fbsvc-b886059a6c.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const notificationService = {
    async sendNotification(userId, notification) {
        try {
            const user = await userService.getUser(userId);
            if (!user || !user.deviceTokens.length) {
                return null;
            }

            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: {
                    type: notification.type,
                    ...notification.data
                },
                tokens: user.deviceTokens
            };

            const response = await admin.messaging().sendMulticast(message);
            
            // Remove invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        invalidTokens.push(user.deviceTokens[idx]);
                    }
                });
                
                if (invalidTokens.length) {
                    await userService.removeDeviceTokens(userId, invalidTokens);
                }
            }

            return response;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    },

    async sendMessageNotification(senderId, receiverId, message) {
        try {
            const sender = await userService.getUser(senderId);
            const receiver = await userService.getUser(receiverId);

            if (!receiver || !receiver.notificationSettings.pushEnabled) {
                return null;
            }

            const notification = {
                title: sender.displayName,
                body: message.type === 'text' ? message.content : `Sent a ${message.type}`,
                type: 'message',
                data: {
                    conversationId: message.conversationId,
                    messageId: message.messageId,
                    senderId: sender.uid
                }
            };

            return await this.sendNotification(receiverId, notification);
        } catch (error) {
            console.error('Error sending message notification:', error);
            throw error;
        }
    },

    async sendStatusNotification(userId, status) {
        try {
            const user = await userService.getUser(userId);
            const followers = await userService.getUserFollowers(userId);

            const notification = {
                title: user.displayName,
                body: status.type === 'text' ? status.content : `Posted a ${status.type}`,
                type: 'status',
                data: {
                    statusId: status.id,
                    userId: user.uid
                }
            };

            const notifications = followers.map(follower => 
                this.sendNotification(follower.uid, notification)
            );

            return await Promise.all(notifications);
        } catch (error) {
            console.error('Error sending status notification:', error);
            throw error;
        }
    },

    async sendGroupMessageNotification(senderId, groupId, message) {
        try {
            const sender = await userService.getUser(senderId);
            const group = await conversationService.getConversation(groupId);
            
            if (!group || !group.participants) {
                return null;
            }

            const notification = {
                title: `${sender.displayName} in ${group.name || 'Group'}`,
                body: message.type === 'text' ? message.content : `Sent a ${message.type}`,
                type: 'group_message',
                data: {
                    conversationId: groupId,
                    messageId: message.messageId,
                    senderId: sender.uid,
                    groupName: group.name
                }
            };

            const notifications = group.participants
                .filter(participantId => participantId !== senderId)
                .map(participantId => this.sendNotification(participantId, notification));

            return await Promise.all(notifications);
        } catch (error) {
            console.error('Error sending group message notification:', error);
            throw error;
        }
    },

    async sendMentionNotification(mentionedUserId, mentionerId, message) {
        try {
            const mentioner = await userService.getUser(mentionerId);
            const mentionedUser = await userService.getUser(mentionedUserId);

            if (!mentionedUser || !mentionedUser.notificationSettings.pushEnabled) {
                return null;
            }

            const notification = {
                title: `${mentioner.displayName} mentioned you`,
                body: message.type === 'text' ? message.content : `Mentioned you in a ${message.type}`,
                type: 'mention',
                data: {
                    conversationId: message.conversationId,
                    messageId: message.messageId,
                    mentionerId: mentioner.uid
                }
            };

            return await this.sendNotification(mentionedUserId, notification);
        } catch (error) {
            console.error('Error sending mention notification:', error);
            throw error;
        }
    }
}; 