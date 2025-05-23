const express = require('express');
const router = express.Router();
const Status = require('../models/status');
const User = require('../models/user');

// Create a new status
router.post('/create', async (req, res) => {
  try {
    const { userId, mediaUrl, type, caption } = req.body;

    const newStatus = new Status({
      userId,
      mediaUrl,
      type,
      caption
    });

    const savedStatus = await newStatus.save();

    // Emit socket event for new status
    req.app.get('io').emit('status:new', {
      userId,
      status: savedStatus
    });

    res.json(savedStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Group statuses by user
    const statusesByUser = await Promise.all(
      statuses.reduce((acc, status) => {
        if (!acc[status.userId]) {
          acc[status.userId] = [];
        }
        acc[status.userId].push(status);
        return acc;
      }, {})
    );

    // Get user details for each status group
    const statusesWithUsers = await Promise.all(
      Object.entries(statusesByUser).map(async ([userId, userStatuses]) => {
        const user = await User.findOne({ uid: userId });
        return {
          user: {
            uid: user.uid,
            name: user.name,
            photoUrl: user.photoUrl,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          },
          statuses: userStatuses.map(status => ({
            id: status._id,
            mediaUrl: status.mediaUrl,
            type: status.type,
            caption: status.caption,
            createdAt: status.createdAt,
            expiresAt: status.expiresAt,
            viewers: status.viewers,
            hasViewed: status.viewers.some(viewer => viewer.userId === userId)
          }))
        };
      })
    );

    res.json(statusesWithUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark status as viewed
router.post('/view/:statusId', async (req, res) => {
  try {
    const { userId } = req.body;
    const status = await Status.findById(req.params.statusId);

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Add viewer if not already viewed
    if (!status.viewers.some(viewer => viewer.userId === userId)) {
      status.viewers.push({
        userId,
        viewedAt: new Date()
      });
      await status.save();

      // Emit socket event for status view
      req.app.get('io').emit('status:viewed', {
        statusId: status._id,
        userId
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a status
router.delete('/:statusId', async (req, res) => {
  try {
    const { userId } = req.body;
    const status = await Status.findOneAndDelete({
      _id: req.params.statusId,
      userId // Ensure user can only delete their own status
    });

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Emit socket event for status deletion
    req.app.get('io').emit('status:deleted', {
      statusId: status._id,
      userId
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 