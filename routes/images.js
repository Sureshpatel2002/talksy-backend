const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/user');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
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

    // Convert image to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Update user's profile picture
    const updatedUser = await User.findOneAndUpdate(
      { uid: userId },
      { $set: { photoUrl: base64Image } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile image uploaded successfully',
      photoUrl: base64Image
    });
  } catch (err) {
    console.error('Error uploading image:', err);
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