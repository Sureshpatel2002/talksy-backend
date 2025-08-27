import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userService, uploadFile } from '../services/s3Service.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Register new user
router.post('/register', async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        const token = jwt.sign(
            { userId: user.uid },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        res.status(201).json({
            status: 'success',
            data: {
                user,
                token
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await userService.getUserByPhone(phone);
        
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // In a real app, you would verify the password here
        // For this example, we'll skip password verification

        const token = jwt.sign(
            { userId: user.uid },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            status: 'success',
            data: {
                user,
                token
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const user = await userService.getUser(req.user.userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const user = await userService.updateUser(req.user.userId, req.body);
        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update profile picture
router.put('/profile/picture', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        const uploadResult = await uploadFile(req.file, 'profile-pictures');
        const user = await userService.updateUser(req.user.userId, {
            photoUrl: uploadResult.url
        });

        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update online status
router.put('/online-status', async (req, res) => {
    try {
        const { isOnline } = req.body;
        const user = await userService.updateUser(req.user.userId, {
            isOnline,
            lastSeen: new Date().toISOString()
        });
        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update notification settings
router.put('/notification-settings', async (req, res) => {
    try {
        const user = await userService.updateNotificationSettings(
            req.user.userId,
            req.body
        );
        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Add device token
router.post('/device-tokens', async (req, res) => {
    try {
        const { token } = req.body;
        const user = await userService.addDeviceToken(req.user.userId, token);
        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Remove device token
router.delete('/device-tokens', async (req, res) => {
    try {
        const { token } = req.body;
        const user = await userService.removeDeviceToken(req.user.userId, token);
        res.json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router; 