const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');

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

    // Create public URL for the image
    const imageUrl = `/uploads/${req.file.filename}`;

    // Update user's profile picture
    const updatedUser = await User.findOneAndUpdate(
      { uid: userId },
      { $set: { photoUrl: imageUrl } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile image uploaded successfully',
      photoUrl: imageUrl
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