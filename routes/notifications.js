import express from 'express';
const router = express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth');

// Get all notifications with pagination and filtering
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const isRead = req.query.isRead === 'true' ? true : 
                      req.query.isRead === 'false' ? false : undefined;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;

        // Filter notifications
        let filteredNotifications = user.notifications;

        if (type) {
            filteredNotifications = filteredNotifications.filter(n => n.type === type);
        }

        if (isRead !== undefined) {
            filteredNotifications = filteredNotifications.filter(n => n.isRead === isRead);
        }

        if (startDate) {
            filteredNotifications = filteredNotifications.filter(n => n.createdAt >= startDate);
        }

        if (endDate) {
            filteredNotifications = filteredNotifications.filter(n => n.createdAt <= endDate);
        }

        // Sort by date (newest first)
        filteredNotifications.sort((a, b) => b.createdAt - a.createdAt);

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

        // Get counts by type
        const countsByType = filteredNotifications.reduce((acc, notification) => {
            acc[notification.type] = (acc[notification.type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            notifications: paginatedNotifications,
            total: filteredNotifications.length,
            unreadCount: user.getUnreadNotificationCount(),
            pages: Math.ceil(filteredNotifications.length / limit),
            countsByType,
            filters: {
                type,
                isRead,
                startDate,
                endDate
            }
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            message: 'Failed to get notifications',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Get notification categories
router.get('/categories', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const categories = {
            message: {
                name: 'Messages',
                icon: 'message',
                count: user.notifications.filter(n => n.type === 'message').length
            },
            status: {
                name: 'Status Updates',
                icon: 'status',
                count: user.notifications.filter(n => ['status_view', 'reaction', 'comment'].includes(n.type)).length
            },
            social: {
                name: 'Social',
                icon: 'people',
                count: user.notifications.filter(n => ['friend_request', 'friend_accept', 'mention'].includes(n.type)).length
            },
            group: {
                name: 'Groups',
                icon: 'group',
                count: user.notifications.filter(n => ['group_invite', 'group_message'].includes(n.type)).length
            },
            call: {
                name: 'Calls',
                icon: 'call',
                count: user.notifications.filter(n => n.type === 'call_missed').length
            }
        };

        res.json(categories);
    } catch (error) {
        console.error('Error getting notification categories:', error);
        res.status(500).json({
            message: 'Failed to get notification categories',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Get unread notification count
router.get('/unread/count', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const unreadCount = user.getUnreadNotificationCount();
        res.json({ unreadCount });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            message: 'Failed to get unread count',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Mark specific notifications as read
router.post('/read', auth, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        user.notifications = user.notifications.map(notification => {
            if (notificationIds.includes(notification._id.toString())) {
                notification.isRead = true;
            }
            return notification;
        });

        await user.save();
        res.json({
            message: 'Notifications marked as read successfully',
            unreadCount: user.getUnreadNotificationCount()
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({
            message: 'Failed to mark notifications as read',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Mark all notifications as read
router.post('/read/all', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        await user.markAllNotificationsAsRead();
        res.json({
            message: 'All notifications marked as read successfully'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            message: 'Failed to mark all notifications as read',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Delete specific notifications
router.delete('/', auth, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        user.notifications = user.notifications.filter(
            notification => !notificationIds.includes(notification._id.toString())
        );

        await user.save();
        res.json({
            message: 'Notifications deleted successfully',
            remainingCount: user.notifications.length
        });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({
            message: 'Failed to delete notifications',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Clean up old notifications
router.post('/cleanup', auth, async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        await user.cleanupOldNotifications(daysToKeep);
        res.json({
            message: 'Old notifications cleaned up successfully',
            remainingCount: user.notifications.length
        });
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
        res.status(500).json({
            message: 'Failed to clean up notifications',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Get user's notifications
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Add actual notification fetching logic
        res.json({
            message: 'Get notifications endpoint',
            userId
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Create notification
router.post('/', async (req, res) => {
    try {
        const { userId, type, content, data } = req.body;
        // TODO: Add actual notification creation logic
        res.status(201).json({
            message: 'Create notification endpoint',
            userId,
            type,
            content,
            data
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        // TODO: Add actual notification read logic
        res.json({
            message: 'Mark notification as read endpoint',
            notificationId
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router; 