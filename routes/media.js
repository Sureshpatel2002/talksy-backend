import express from 'express';
import { getPresignedUrl } from '../services/s3Service.js';

const router = express.Router();

// Test endpoint for pre-signed URL (no auth required)
router.get('/test-upload', async (req, res) => {
    try {
        const testParams = {
            type: 'profile',
            fileName: 'test-profile.jpg',
            contentType: 'image/jpeg',
            userId: 'test-user-123'
        };

        const presignedUrl = await getPresignedUrl(
            testParams.type,
            testParams.fileName,
            testParams.contentType,
            testParams.userId
        );
        
        res.json({
            status: 'success',
            data: {
                presignedUrl,
                testParams,
                instructions: 'Use this pre-signed URL to upload a test image using curl or Postman'
            }
        });
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get pre-signed URL for upload (requires auth)
router.get('/presigned-url', async (req, res) => {
    try {
        const { type, fileName, contentType, userId } = req.query;

        if (!type || !fileName || !contentType) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameters: type, fileName, contentType'
            });
        }

        const presignedUrl = await getPresignedUrl(type, fileName, contentType, userId);
        
        res.json({
            status: 'success',
            data: presignedUrl
        });
    } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router; 