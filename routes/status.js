import express from 'express';
const router = express.Router();
const Status = require('../models/status');
const User = require('../models/user');
const { upload } = require('../lib/s3Upload');

// Create a new status with image/video
router.post('/create', upload.single('media'), async (req, res) => {
  try {
    const { userId, caption, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get the S3 file URL
    const mediaUrl = req.file.location;

    // Check if user already has a status document
    let statusDoc = await Status.findOne({ userId });

    if (statusDoc) {
      // Add new status to existing list
      statusDoc.statuses.push({
        mediaUrl,
        type: type || 'image',
        caption: caption || ''
      });
    } else {
      // Create new status document with first status
      statusDoc = new Status({
        userId,
        statuses: [{
          mediaUrl,
          type: type || 'image',
          caption: caption || ''
        }]
      });
    }

    const savedStatus = await statusDoc.save();

    // Emit socket event for new status
    req.app.get('io').emit('status:new', {
      userId,
      status: savedStatus
    });

    res.json(savedStatus);
  } catch (err) {
    console.error('Error creating status:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all active statuses
router.get('/all', async (req, res) => {
  try {
    const { userId } = req.query;

    // Get all statuses that haven't expired
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    // Get user details for each status group
    const statusesWithUsers = await Promise.all(
      statuses.map(async (statusDoc) => {
        const user = await User.findOne({ uid: statusDoc.userId });
        return {
          user: {
            uid: user.uid,
            name: user.name,
            photoUrl: user.photoUrl,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          },
          statuses: statusDoc.statuses.map(status => ({
            id: status._id,
            mediaUrl: status.mediaUrl,
            type: status.type,
            caption: status.caption,
            createdAt: status.createdAt,
            expiresAt: statusDoc.expiresAt,
            viewers: status.viewers,
            hasViewed: status.viewers.some(viewer => viewer.userId === userId)
          }))
        };
      })
    );

    res.json(statusesWithUsers);
  } catch (err) {
    console.error('Error fetching statuses:', err);
    res.status(500).json({ message: err.message });
  }
});

// Mark status as viewed
router.post('/view/:statusId', async (req, res) => {
  try {
    const { userId } = req.body;
    const statusDoc = await Status.findOne({
      'statuses._id': req.params.statusId
    });

    if (!statusDoc) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // Find the specific status in the array
    const status = statusDoc.statuses.id(req.params.statusId);

    // Add viewer if not already viewed
    if (!status.viewers.some(viewer => viewer.userId === userId)) {
      status.viewers.push({
        userId,
        viewedAt: new Date()
      });
      await statusDoc.save();

      // Emit socket event for status view
      req.app.get('io').emit('status:viewed', {
        statusId: status._id,
        userId
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking status as viewed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a particular status
router.delete('/:statusId', async (req, res) => {
  try {
    const { userId } = req.body;
    const { statusId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the status document containing the specific status
    const statusDoc = await Status.findOne({
      userId,
      'statuses._id': statusId
    });

    if (!statusDoc) {
      return res.status(404).json({ message: 'Status not found or you do not have permission to delete it' });
    }

    // Find the specific status in the array
    const statusToDelete = statusDoc.statuses.id(statusId);
    if (!statusToDelete) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // Remove the specific status from the array
    statusDoc.statuses.pull(statusId);

    // If no statuses left, delete the entire document
    if (statusDoc.statuses.length === 0) {
      await Status.deleteOne({ _id: statusDoc._id });
    } else {
      await statusDoc.save();
    }

    // Emit socket event for status deletion
    req.app.get('io').emit('status:deleted', {
      statusId,
      userId,
      deletedAt: new Date()
    });

    res.json({ 
      success: true,
      message: 'Status deleted successfully',
      remainingStatuses: statusDoc.statuses.length
    });
  } catch (err) {
    console.error('Error deleting status:', err);
    res.status(500).json({ message: 'Failed to delete status' });
  }
});

// Get user's status
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Add actual status fetching logic
        res.json({
            message: 'Get status endpoint',
            userId
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Create new status
router.post('/', async (req, res) => {
    try {
        const { userId, content, type, mediaUrl } = req.body;
        // TODO: Add actual status creation logic
        res.status(201).json({
            message: 'Create status endpoint',
            userId,
            content,
            type,
            mediaUrl
        });
    } catch (error) {
        console.error('Create status error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Delete status
router.delete('/:statusId', async (req, res) => {
    try {
        const { statusId } = req.params;
        // TODO: Add actual status deletion logic
        res.json({
            message: 'Delete status endpoint',
            statusId
        });
    } catch (error) {
        console.error('Delete status error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router; 