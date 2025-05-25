const express = require('express');
const router = express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth');
const { handleNotification } = require('../middleware/notifications');

// Quick reply to message notification
router.post('/reply', auth, async (req, res) => {
    try {
        const { notificationId, message } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const notification = user.notifications.find(n => n._id.toString() === notificationId);
        if (!notification || notification.type !== 'message') {
            return res.status(400).json({
                message: 'Invalid notification or type',
                error: 'INVALID_NOTIFICATION'
            });
        }

        // Send reply message
        const io = req.app.get('io');
        io.emit('message:send', {
            conversationId: notification.messageId,
            senderId: req.user.uid,
            receiverId: notification.fromUserId,
            content: message,
            type: 'text',
            timestamp: new Date()
        });

        // Mark notification as read
        notification.isRead = true;
        await user.save();

        res.json({
            message: 'Reply sent successfully',
            notification
        });
    } catch (error) {
        console.error('Error sending quick reply:', error);
        res.status(500).json({
            message: 'Failed to send reply',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Accept friend request from notification
router.post('/accept-friend', auth, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const notification = user.notifications.find(n => n._id.toString() === notificationId);
        if (!notification || notification.type !== 'friend_request') {
            return res.status(400).json({
                message: 'Invalid notification or type',
                error: 'INVALID_NOTIFICATION'
            });
        }

        // Add friend
        const friend = await User.findOne({ uid: notification.fromUserId });
        if (friend) {
            // Add to friends list (implement your friend logic here)
            // ...

            // Send acceptance notification
            const io = req.app.get('io');
            await io.sendNotification(notification.fromUserId, {
                type: 'friend_accept',
                fromUserId: req.user.uid,
                message: `${user.displayName} accepted your friend request`
            });
        }

        // Mark notification as read
        notification.isRead = true;
        await user.save();

        res.json({
            message: 'Friend request accepted',
            notification
        });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({
            message: 'Failed to accept friend request',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Join group from notification
router.post('/join-group', auth, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const notification = user.notifications.find(n => n._id.toString() === notificationId);
        if (!notification || notification.type !== 'group_invite') {
            return res.status(400).json({
                message: 'Invalid notification or type',
                error: 'INVALID_NOTIFICATION'
            });
        }

        // Join group (implement your group joining logic here)
        // ...

        // Mark notification as read
        notification.isRead = true;
        await user.save();

        res.json({
            message: 'Joined group successfully',
            notification
        });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(500).json({
            message: 'Failed to join group',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Return missed call
router.post('/return-call', auth, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const notification = user.notifications.find(n => n._id.toString() === notificationId);
        if (!notification || notification.type !== 'call_missed') {
            return res.status(400).json({
                message: 'Invalid notification or type',
                error: 'INVALID_NOTIFICATION'
            });
        }

        // Initiate call (implement your call logic here)
        const io = req.app.get('io');
        io.to(`notifications:${notification.fromUserId}`).emit('call:initiate', {
            fromUserId: req.user.uid,
            type: 'return_call'
        });

        // Mark notification as read
        notification.isRead = true;
        await user.save();

        res.json({
            message: 'Call initiated',
            notification
        });
    } catch (error) {
        console.error('Error returning call:', error);
        res.status(500).json({
            message: 'Failed to return call',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

module.exports = router; 