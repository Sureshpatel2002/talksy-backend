import express from 'express';
const router = express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth');

// Get notification analytics
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Add actual notification analytics fetching logic
        res.json({
            message: 'Get notification analytics endpoint',
            userId
        });
    } catch (error) {
        console.error('Get notification analytics error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Track notification event
router.post('/track', async (req, res) => {
    try {
        const { userId, eventType, data } = req.body;
        // TODO: Add actual notification event tracking logic
        res.status(201).json({
            message: 'Track notification event endpoint',
            userId,
            eventType,
            data
        });
    } catch (error) {
        console.error('Track notification event error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Get notification analytics
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        // Get time range from query params
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Filter notifications within time range
        const recentNotifications = user.notifications.filter(
            n => n.createdAt >= startDate
        );

        // Calculate analytics
        const analytics = {
            total: recentNotifications.length,
            byType: {},
            byTime: {
                morning: 0,    // 6-12
                afternoon: 0,  // 12-18
                evening: 0,    // 18-24
                night: 0      // 0-6
            },
            engagement: {
                read: 0,
                unread: 0,
                actioned: 0
            },
            trends: {
                daily: {},
                weekly: {}
            }
        };

        // Process notifications
        recentNotifications.forEach(notification => {
            // Count by type
            analytics.byType[notification.type] = (analytics.byType[notification.type] || 0) + 1;

            // Count by time of day
            const hour = notification.createdAt.getHours();
            if (hour >= 6 && hour < 12) analytics.byTime.morning++;
            else if (hour >= 12 && hour < 18) analytics.byTime.afternoon++;
            else if (hour >= 18 && hour < 24) analytics.byTime.evening++;
            else analytics.byTime.night++;

            // Count engagement
            if (notification.isRead) analytics.engagement.read++;
            else analytics.engagement.unread++;

            // Count daily trends
            const date = notification.createdAt.toISOString().split('T')[0];
            analytics.trends.daily[date] = (analytics.trends.daily[date] || 0) + 1;

            // Count weekly trends
            const week = getWeekNumber(notification.createdAt);
            analytics.trends.weekly[week] = (analytics.trends.weekly[week] || 0) + 1;
        });

        // Calculate percentages
        analytics.engagement.readPercentage = (analytics.engagement.read / analytics.total) * 100;
        analytics.engagement.unreadPercentage = (analytics.engagement.unread / analytics.total) * 100;

        // Sort types by frequency
        analytics.byType = Object.entries(analytics.byType)
            .sort(([,a], [,b]) => b - a)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        res.json(analytics);
    } catch (error) {
        console.error('Error getting notification analytics:', error);
        res.status(500).json({
            message: 'Failed to get notification analytics',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Helper function to get week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default router; 