import express from 'express';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Send test notification
router.post('/test', async (req, res) => {
    try {
        const { title, body, data } = req.body;
        const userId = req.user.userId;

        const notification = {
            title,
            body,
            type: 'test',
            data: data || {}
        };

        const result = await notificationService.sendNotification(userId, notification);
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get notification settings
router.get('/settings', async (req, res) => {
    try {
        const user = await userService.getUser(req.user.userId);
        res.json({
            status: 'success',
            data: user.notificationSettings
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update notification settings
router.put('/settings', async (req, res) => {
    try {
        const user = await userService.updateNotificationSettings(
            req.user.userId,
            req.body
        );
        res.json({
            status: 'success',
            data: user.notificationSettings
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router; 