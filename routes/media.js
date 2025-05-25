const express = require('express');
const router = express.Router();
const { upload, s3Client, testS3Connection, getBucketUrl } = require('../lib/s3Upload');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Middleware to check S3 connection
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
router.post('/profile/:userId', auth, checkS3Connection, upload.single('image'), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded',
                error: 'FILE_MISSING'
            });
        }

        // Validate file type
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({
                message: 'Invalid file type. Only images are allowed for profile pictures.',
                error: 'INVALID_FILE_TYPE'
            });
        }

        // Get the S3 file URL
        const photoUrl = req.file.location;
        if (!photoUrl) {
            return res.status(500).json({
                message: 'Failed to get S3 URL',
                error: 'S3_URL_MISSING'
            });
        }

        // Update user's profile with photo URL
        const updatePromise = User.findOneAndUpdate(
            { uid: userId },
            { $set: { photoUrl } },
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
            photoUrl
        });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: 'UPLOAD_ERROR',
            details: error.message
        });
    }
});

// Upload status (text or media)
router.post('/status/:userId', auth, checkS3Connection, upload.single('media'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { text } = req.body;
        
        const statusData = {
            text: text || null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        if (req.file) {
            // Validate file type
            const isImage = req.file.mimetype.startsWith('image/');
            const isVideo = req.file.mimetype.startsWith('video/');
            
            if (!isImage && !isVideo) {
                return res.status(400).json({
                    message: 'Invalid file type. Only images and videos are allowed.',
                    error: 'INVALID_FILE_TYPE'
                });
            }

            // Get the S3 file URL
            const mediaUrl = req.file.location;
            if (!mediaUrl) {
                return res.status(500).json({
                    message: 'Failed to get S3 URL',
                    error: 'S3_URL_MISSING'
                });
            }

            statusData.mediaUrl = mediaUrl;
            statusData.mediaType = isImage ? 'image' : 'video';
        }

        // Update user's status
        const updatePromise = User.findOneAndUpdate(
            { uid: userId },
            { $set: { status: statusData } },
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
            message: 'Status updated successfully',
            status: statusData
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: 'UPDATE_ERROR',
            details: error.message
        });
    }
});

// Get user profile and status
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.userId });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        res.json({
            photoUrl: user.photoUrl || null,
            status: user.status || null
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: 'FETCH_ERROR',
            details: error.message
        });
    }
});

// Get S3 bucket URL
router.get('/bucket-url', (req, res) => {
    try {
        const bucketUrl = getBucketUrl();
        res.json({
            bucketUrl,
            message: 'S3 bucket URL retrieved successfully'
        });
    } catch (error) {
        console.error('Error getting bucket URL:', error);
        res.status(500).json({
            message: 'Failed to get bucket URL',
            error: 'BUCKET_URL_ERROR',
            details: error.message
        });
    }
});

// Delete expired statuses
router.delete('/status/cleanup', auth, async (req, res) => {
    try {
        const now = new Date();
        const users = await User.find({
            'status.expiresAt': { $lt: now }
        });

        const cleanupPromises = users.map(async (user) => {
            if (user.status?.mediaUrl) {
                // Extract key from mediaUrl
                const key = user.status.mediaUrl.split('.com/')[1];
                try {
                    // Delete from S3
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: key
                    }));
                } catch (error) {
                    console.error(`Failed to delete S3 object ${key}:`, error);
                }
            }
            
            // Clear status in database
            user.status = null;
            await user.save();
        });

        await Promise.all(cleanupPromises);

        res.json({
            message: 'Successfully cleaned up expired statuses',
            cleanedCount: users.length
        });
    } catch (error) {
        console.error('Error cleaning up statuses:', error);
        res.status(500).json({
            message: 'Failed to clean up statuses',
            error: 'CLEANUP_ERROR',
            details: error.message
        });
    }
});

// List all statuses for a user
router.get('/status/:userId', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.userId });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        // Check if status is expired
        const now = new Date();
        if (user.status?.expiresAt && user.status.expiresAt < now) {
            // Clean up expired status
            if (user.status.mediaUrl) {
                const key = user.status.mediaUrl.split('.com/')[1];
                try {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: key
                    }));
                } catch (error) {
                    console.error(`Failed to delete expired S3 object ${key}:`, error);
                }
            }
            user.status = null;
            await user.save();
        }

        res.json({
            status: user.status || null,
            isExpired: user.status?.expiresAt < now
        });
    } catch (error) {
        console.error('Error getting user status:', error);
        res.status(500).json({
            message: 'Failed to get user status',
            error: 'FETCH_ERROR',
            details: error.message
        });
    }
});

// Delete specific status
router.delete('/status/:userId', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.userId });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        if (user.status?.mediaUrl) {
            // Delete media from S3
            const key = user.status.mediaUrl.split('.com/')[1];
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }));
            } catch (error) {
                console.error(`Failed to delete S3 object ${key}:`, error);
            }
        }

        // Clear status in database
        user.status = null;
        await user.save();

        res.json({
            message: 'Status deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({
            message: 'Failed to delete status',
            error: 'DELETE_ERROR',
            details: error.message
        });
    }
});

// Add reaction to status
router.post('/status/:userId/reaction', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.body;
        const reactorId = req.user.uid;

        if (!type || !['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(type)) {
            return res.status(400).json({
                message: 'Invalid reaction type',
                error: 'INVALID_REACTION'
            });
        }

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        if (!user.status) {
            return res.status(400).json({
                message: 'User has no active status',
                error: 'NO_STATUS'
            });
        }

        const success = await user.addReaction(reactorId, type);
        if (!success) {
            return res.status(400).json({
                message: 'Failed to add reaction',
                error: 'REACTION_ERROR'
            });
        }

        // Add notification for reaction
        await user.addNotification({
            type: 'reaction',
            fromUserId: reactorId,
            statusId: user._id.toString(),
            reactionType: type
        });

        res.json({
            message: 'Reaction added successfully',
            reactions: user.status.reactions,
            reactionCounts: user.status.reactionCounts
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({
            message: 'Failed to add reaction',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Remove reaction from status
router.delete('/status/:userId/reaction', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const reactorId = req.user.uid;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const success = await user.removeReaction(reactorId);
        if (!success) {
            return res.status(400).json({
                message: 'Failed to remove reaction',
                error: 'REACTION_ERROR'
            });
        }

        res.json({
            message: 'Reaction removed successfully',
            reactions: user.status.reactions
        });
    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({
            message: 'Failed to remove reaction',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Add comment to status
router.post('/status/:userId/comment', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { text, mentions = [] } = req.body;
        const commenterId = req.user.uid;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                message: 'Comment text is required',
                error: 'INVALID_COMMENT'
            });
        }

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        if (!user.status) {
            return res.status(400).json({
                message: 'User has no active status',
                error: 'NO_STATUS'
            });
        }

        const success = await user.addComment(commenterId, text.trim(), mentions);
        if (!success) {
            return res.status(400).json({
                message: 'Failed to add comment',
                error: 'COMMENT_ERROR'
            });
        }

        // Get the latest comment
        const latestComment = user.status.comments[user.status.comments.length - 1];

        // Add notification for comment
        await user.addNotification({
            type: 'comment',
            fromUserId: commenterId,
            statusId: user._id.toString(),
            commentId: latestComment._id.toString()
        });

        // Add notifications for mentions
        for (const mentionedUserId of mentions) {
            const mentionedUser = await User.findOne({ uid: mentionedUserId });
            if (mentionedUser) {
                await mentionedUser.addNotification({
                    type: 'mention',
                    fromUserId: commenterId,
                    statusId: user._id.toString(),
                    commentId: latestComment._id.toString()
                });
            }
        }

        res.json({
            message: 'Comment added successfully',
            comment: latestComment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            message: 'Failed to add comment',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Remove comment from status
router.delete('/status/:userId/comment/:commentId', auth, async (req, res) => {
    try {
        const { userId, commentId } = req.params;
        const commenterId = req.user.uid;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        // Check if user is the comment owner
        const comment = user.status?.comments.find(c => c._id.toString() === commentId);
        if (!comment) {
            return res.status(404).json({
                message: 'Comment not found',
                error: 'COMMENT_NOT_FOUND'
            });
        }

        if (comment.userId !== commenterId) {
            return res.status(403).json({
                message: 'Not authorized to delete this comment',
                error: 'UNAUTHORIZED'
            });
        }

        const success = await user.removeComment(commentId);
        if (!success) {
            return res.status(400).json({
                message: 'Failed to remove comment',
                error: 'COMMENT_ERROR'
            });
        }

        res.json({
            message: 'Comment removed successfully',
            comments: user.status.comments
        });
    } catch (error) {
        console.error('Error removing comment:', error);
        res.status(500).json({
            message: 'Failed to remove comment',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// View status (increment view count)
router.post('/status/:userId/view', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const viewerId = req.user.uid;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        if (!user.status) {
            return res.status(400).json({
                message: 'User has no active status',
                error: 'NO_STATUS'
            });
        }

        const success = await user.incrementViewCount();
        if (!success) {
            return res.status(400).json({
                message: 'Failed to increment view count',
                error: 'VIEW_ERROR'
            });
        }

        res.json({
            message: 'View count updated successfully',
            viewCount: user.status.viewCount
        });
    } catch (error) {
        console.error('Error updating view count:', error);
        res.status(500).json({
            message: 'Failed to update view count',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Get paginated comments
router.get('/status/:userId/comments', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const commentsData = await user.getPaginatedComments(page, limit);
        res.json(commentsData);
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({
            message: 'Failed to get comments',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const notifications = user.notifications.slice(startIndex, endIndex);
        const total = user.notifications.length;

        res.json({
            notifications,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            message: 'Failed to get notifications',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Mark notifications as read
router.post('/notifications/read', auth, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const user = await User.findOne({ uid: req.user.uid });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        await user.markNotificationsAsRead(notificationIds);
        res.json({
            message: 'Notifications marked as read successfully'
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({
            message: 'Failed to mark notifications as read',
            error: 'SERVER_ERROR',
            details: error.message
        });
    }
});

// Get status with reaction counts
router.get('/status/:userId', auth, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.userId });
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        // Check if status is expired
        const now = new Date();
        if (user.status?.expiresAt && user.status.expiresAt < now) {
            // Clean up expired status
            if (user.status.mediaUrl) {
                const key = user.status.mediaUrl.split('.com/')[1];
                try {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: key
                    }));
                } catch (error) {
                    console.error(`Failed to delete expired S3 object ${key}:`, error);
                }
            }
            user.status = null;
            await user.save();
        }

        res.json({
            status: user.status ? {
                ...user.status.toObject(),
                reactionCounts: user.status.reactionCounts
            } : null,
            isExpired: user.status?.expiresAt < now
        });
    } catch (error) {
        console.error('Error getting user status:', error);
        res.status(500).json({
            message: 'Failed to get user status',
            error: 'FETCH_ERROR',
            details: error.message
        });
    }
});

module.exports = router; 