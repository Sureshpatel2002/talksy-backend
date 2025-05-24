const express = require('express');
const router = express.Router();
const { upload } = require('../lib/s3Upload');

// Test route for file upload
router.post('/test', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.json({
            message: 'File uploaded successfully',
            file: {
                location: req.file.location,
                key: req.file.key,
                bucket: req.file.bucket,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

module.exports = router; 