import express from 'express';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Test notification endpoint
router.post('/test', async (req, res) => {
    try {
        const { userId, title, body } = req.body;
        
        const notification = {
            title: title || 'Test Notification',
            body: body || 'This is a test notification',
            type: 'test',
            data: {
                testKey: 'testValue'
            }
        };

        const result = await notificationService.sendNotification(userId, notification);
        
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router; 