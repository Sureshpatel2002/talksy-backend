const User = require('../models/user');

// Middleware to handle notification delivery with sound and badge
const handleNotification = async (req, res, next) => {
    const io = req.app.get('io');
    const { userId, notification } = req.body;

    try {
        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        // Check notification preferences
        const shouldPlaySound = user.notificationPreferences.sound?.enabled;
        const shouldShowBadge = user.notificationPreferences.badge?.enabled;
        const shouldShowCount = user.notificationPreferences.badge?.showCount;

        // Add notification to user's list
        await user.addNotification(notification);

        // Get unread count for badge
        const unreadCount = user.getUnreadNotificationCount();

        // Emit notification with sound and badge settings
        io.to(`notifications:${userId}`).emit('notification:new', {
            ...notification,
            sound: shouldPlaySound ? {
                enabled: true,
                volume: user.notificationPreferences.sound.volume
            } : { enabled: false },
            badge: shouldShowBadge ? {
                enabled: true,
                count: shouldShowCount ? unreadCount : null
            } : { enabled: false }
        });

        next();
    } catch (error) {
        console.error('Error handling notification:', error);
        res.status(500).json({
            message: 'Failed to handle notification',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
};

// Middleware to update badge count
const updateBadgeCount = async (req, res, next) => {
    const io = req.app.get('io');
    const { userId } = req.params;

    try {
        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const unreadCount = user.getUnreadNotificationCount();
        const shouldShowBadge = user.notificationPreferences.badge?.enabled;
        const shouldShowCount = user.notificationPreferences.badge?.showCount;

        if (shouldShowBadge) {
            io.to(`notifications:${userId}`).emit('badge:update', {
                count: shouldShowCount ? unreadCount : null
            });
        }

        next();
    } catch (error) {
        console.error('Error updating badge count:', error);
        res.status(500).json({
            message: 'Failed to update badge count',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
};

module.exports = {
    handleNotification,
    updateBadgeCount
}; 