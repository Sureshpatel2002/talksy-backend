import express from 'express';
const router = express.Router();
const { upload, s3Client, testS3Connection } = require('../lib/s3Upload');

// Test S3 connection
router.get('/test-connection', async (req, res) => {
    try {
        const isConnected = await testS3Connection();
        if (!isConnected) {
            return res.status(500).json({
                message: 'S3 connection test failed',
                error: 'S3_CONNECTION_ERROR'
            });
        }
        res.json({
            message: 'S3 connection test successful',
            status: 'connected'
        });
    } catch (error) {
        console.error('S3 connection test failed:', error);
        res.status(500).json({
            message: 'S3 connection test failed',
            error: 'S3_CONNECTION_ERROR',
            details: error.message
        });
    }
});

// Test file upload
router.post('/test-upload', upload.single('testFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded',
                error: 'FILE_MISSING'
            });
        }

        res.json({
            message: 'Test upload successful',
            file: {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                location: req.file.location
            }
        });
    } catch (error) {
        console.error('Test upload failed:', error);
        res.status(500).json({
            message: 'Test upload failed',
            error: 'UPLOAD_ERROR',
            details: error.message
        });
    }
});

// Test file upload
router.post('/test', async (req, res) => {
    try {
        // TODO: Add actual test upload logic
        res.status(201).json({
            message: 'Test upload endpoint'
        });
    } catch (error) {
        console.error('Test upload error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Test S3 connection
router.get('/test-s3', async (req, res) => {
    try {
        // TODO: Add actual S3 connection test logic
        res.json({
            message: 'S3 connection test endpoint'
        });
    } catch (error) {
        console.error('S3 connection test error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router; 