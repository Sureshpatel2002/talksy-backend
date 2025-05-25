const express = require('express');
const router = express.Router();
const { upload, s3Client, testS3Connection } = require('../lib/s3Upload');
const User = require('../models/user');
const Status = require('../models/status');
const auth = require('../middleware/auth');

// Middleware to check S3 connection before upload
const checkS3Connection = async (req, res, next) => {
    try {
        const isConnected = await testS3Connection();
        if (!isConnected) {
            return res.status(500).json({
                message: 'S3 connection failed',
                error: 'S3_CONNECTION_ERROR'
            });
        }
        next();
    } catch (error) {
        console.error('S3 connection check failed:', error);
        res.status(500).json({
            message: 'S3 connection check failed',
            error: 'S3_CONNECTION_ERROR',
            details: error.message
        });
    }
};

// Upload profile image
router.post('/upload/:userId', auth, checkS3Connection, upload.single('image'), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded',
                error: 'FILE_MISSING'
            });
        }

        // Validate file
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({
                message: 'Invalid file type. Only images are allowed.',
                error: 'INVALID_FILE_TYPE'
            });
        }

        // Get the S3 file URL
        const imageUrl = req.file.location;
        if (!imageUrl) {
            return res.status(500).json({
                message: 'Failed to get S3 URL',
                error: 'S3_URL_MISSING'
            });
        }

        // Update user's profile picture with timeout
        const updatePromise = User.findOneAndUpdate(
            { uid: userId },
            { $set: { photoUrl: imageUrl } },
            { new: true }
        );

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database update timed out')), 10000);
        });

        const updatedUser = await Promise.race([updatePromise, timeoutPromise]);

        if (!updatedUser) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                userId
            });
        }

        res.json({
            message: 'Profile image uploaded successfully',
            photoUrl: imageUrl
        });
    } catch (error) {
        console.error('Error uploading image:', {
            name: error.name,
            message: error.message,
            code: error.code
        });

        // Handle specific errors
        if (error.name === 'SignatureDoesNotMatch') {
            return res.status(500).json({
                message: 'AWS credentials error',
                error: 'AWS_CREDENTIALS_ERROR',
                details: error.message
            });
        }

        if (error.name === 'NoSuchBucket') {
            return res.status(500).json({
                message: 'AWS bucket not found',
                error: 'AWS_BUCKET_ERROR',
                details: error.message
            });
        }

        if (error.message === 'Database update timed out') {
            return res.status(504).json({
                message: 'Request timed out',
                error: 'TIMEOUT_ERROR',
                details: 'Database update took too long'
            });
        }

        res.status(500).json({
            message: 'Internal server error',
            error: 'UPLOAD_ERROR',
            details: error.message
        });
    }
});

// Upload status
router.post('/status/:userId', auth, upload.single('media'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this status' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    // Get the S3 file URL
    const mediaUrl = file.location;

    // Create status in database
    const status = new Status({
      userId: userId,
      mediaUrl: mediaUrl,
      mediaType: mediaType
    });

    await status.save();

    res.json({
      message: 'Status uploaded successfully',
      status: {
        id: status._id,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        createdAt: status.createdAt
      }
    });
  } catch (err) {
    console.error('Error uploading status:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all statuses for a user
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all statuses from the last 24 hours
    const statuses = await Status.find({
      userId: userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    // Check if the current user has viewed these statuses
    const statusesWithViewInfo = statuses.map(status => ({
      ...status.toObject(),
      viewed: status.viewedBy.includes(req.user.uid)
    }));

    res.json({ statuses: statusesWithViewInfo });
  } catch (err) {
    console.error('Error getting statuses:', err);
    res.status(500).json({ message: err.message });
  }
});

// Mark status as viewed
router.post('/status/:statusId/view', auth, async (req, res) => {
  try {
    const { statusId } = req.params;
    
    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // Add viewer if not already viewed
    if (!status.viewedBy.includes(req.user.uid)) {
      status.viewedBy.push(req.user.uid);
      await status.save();
    }

    res.json({ message: 'Status marked as viewed' });
  } catch (err) {
    console.error('Error marking status as viewed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get profile image
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.userId });
        
        if (!user || !user.photoUrl) {
            return res.status(404).json({
                message: 'Profile image not found',
                error: 'IMAGE_NOT_FOUND'
            });
        }

        res.json({ photoUrl: user.photoUrl });
    } catch (error) {
        console.error('Error getting profile image:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: 'FETCH_ERROR',
            details: error.message
        });
    }
});

module.exports = router; 