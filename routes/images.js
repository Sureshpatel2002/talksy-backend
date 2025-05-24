const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const Status = require('../models/status');
const auth = require('../middleware/auth');

// Get the base URL from environment variable or use default
const BASE_URL = process.env.BASE_URL || 'https://your-app.onrender.com';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'), false);
    }
  }
});

// Upload profile image
router.post('/upload/:userId', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create public URL for the image
    const imageUrl = `/uploads/${req.file.filename}`;
    const networkUrl = `${BASE_URL}${imageUrl}`;

    // Update user's profile picture
    const updatedUser = await User.findOneAndUpdate(
      { uid: userId },
      { $set: { photoUrl: networkUrl } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile image uploaded successfully',
      photoUrl: networkUrl
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ message: err.message });
  }
});

// Upload status (image or video)
router.post('/status/:userId', auth, upload.single('media'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the authenticated user is the same as the requested user
    if (req.user.uid !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this status' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Determine media type
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    // Create URLs for the media
    const mediaUrl = `/uploads/${req.file.filename}`;
    const networkUrl = `${BASE_URL}${mediaUrl}`;

    // Create new status
    const status = new Status({
      userId: userId,
      mediaUrl: mediaUrl,
      networkUrl: networkUrl,
      mediaType: mediaType
    });

    await status.save();

    res.json({
      message: 'Status uploaded successfully',
      status: {
        id: status._id,
        mediaUrl: networkUrl,
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
      mediaUrl: status.networkUrl, // Use network URL instead of local path
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
      return res.status(404).json({ message: 'Profile image not found' });
    }

    res.json({ photoUrl: user.photoUrl });
  } catch (err) {
    console.error('Error getting profile image:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 