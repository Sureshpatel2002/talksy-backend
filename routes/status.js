import express from 'express';
import multer from 'multer';
import { statusService, uploadFile } from '../services/s3Service.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create new status
router.post('/', upload.single('media'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { caption } = req.body;
        let mediaUrl = null;

        if (req.file) {
            const uploadResult = await uploadFile(req.file, 'status-media');
            mediaUrl = uploadResult.url;
        }

        const statusData = {
            id: crypto.randomUUID(),
            caption,
            mediaUrl,
            type: req.file ? req.file.mimetype.startsWith('image/') ? 'image' : 'video' : 'text',
            createdAt: new Date().toISOString()
        };

        const status = await statusService.createStatus(userId, statusData);
        res.status(201).json({
            status: 'success',
            data: status
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get user's statuses
router.get('/my', async (req, res) => {
    try {
        const userId = req.user.userId;
        const statuses = await statusService.getUserStatuses(userId);
        res.json({
            status: 'success',
            data: statuses
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Delete status
router.delete('/:statusId', async (req, res) => {
    try {
        const { statusId } = req.params;
        await statusService.deleteStatus(statusId);
        res.json({
            status: 'success',
            message: 'Status deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router; 