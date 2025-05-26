import express from 'express';
import User from '../models/user.js';
import Conversation from '../models/conversation.js';
import Message from '../models/message.js';
import { getIO } from '../socket.js';

const router = express.Router();

// Create or update user
router.post('/update', async (req, res) => {
  try {
    const { 
      uid, 
      name, 
      photoUrl, 
      email, 
      bio, 
      age, 
      gender, 
      fcmToken, 
      status, 
      isOnline, 
      lastSeen 
    } = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Create or update user
    const user = await User.findOneAndUpdate(
      { uid },
      { 
        $set: { 
          name, 
          photoUrl, 
          email, 
          bio, 
          age, 
          gender, 
          fcmToken, 
          status, 
          isOnline, 
          lastSeen: lastSeen ? new Date(lastSeen) : new Date()
        } 
      },
      { upsert: true, new: true }
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: user.getPublicProfile()
    });

  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
});

// Update user online status
router.put('/status/:uid', async (req, res) => {
  const { isOnline, status, lastSeen } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { 
        $set: { 
          isOnline, 
          status, 
          lastSeen: lastSeen ? new Date(lastSeen) : new Date()
        } 
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const searchQuery = req.params.query;
    const users = await User.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:uid', async (req, res) => {
  try {
    await User.findOneAndDelete({ uid: req.params.uid });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users except current user with their last message
router.get('/all/:currentUserId', async (req, res) => {
  try {
    const { currentUserId } = req.params;

    // Get all users except current user
    const users = await User.find({ uid: { $ne: currentUserId } });

    // Get conversations and last messages for each user
    const usersWithLastMessage = await Promise.all(users.map(async (user) => {
      // Find conversation between current user and this user
      const conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, user.uid] }
      }).populate({
        path: 'lastMessage',
        populate: {
          path: 'replyTo'
        }
      });

      return {
        uid: user.uid,
        name: user.name,
        photoUrl: user.photoUrl,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        lastMessage: conversation?.lastMessage ? {
          id: conversation.lastMessage._id,
          content: conversation.lastMessage.content,
          type: conversation.lastMessage.type,
          timestamp: conversation.lastMessage.timestamp,
          isRead: conversation.lastMessage.isRead,
          senderId: conversation.lastMessage.senderId,
          receiverId: conversation.lastMessage.receiverId
        } : null
      };
    }));

    res.json(usersWithLastMessage);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update user's contact information
router.put('/:userId/contact', async (req, res) => {
    try {
        const { userId } = req.params;
        const contactData = req.body;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const updatedUser = await user.updateContactInfo(contactData);

        // Notify friends about profile update
        const io = getIO();
        user.friends.forEach(friendId => {
            io.to(friendId).emit('user:profile:updated', {
                userId,
                updates: {
                    phoneNumber: updatedUser.phoneNumber,
                    countryCode: updatedUser.countryCode,
                    address: updatedUser.address,
                    socialLinks: updatedUser.socialLinks,
                    dateOfBirth: updatedUser.dateOfBirth,
                    gender: updatedUser.gender,
                    language: updatedUser.language,
                    timezone: updatedUser.timezone
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Contact information updated successfully',
            user: updatedUser.getPublicProfile()
        });
    } catch (error) {
        console.error('Error updating contact information:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating contact information',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Update user's privacy settings
router.put('/:userId/privacy', async (req, res) => {
    try {
        const { userId } = req.params;
        const settings = req.body;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const updatedUser = await user.updatePrivacySettings(settings);

        res.status(200).json({
            success: true,
            message: 'Privacy settings updated successfully',
            privacySettings: updatedUser.privacySettings
        });
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating privacy settings',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Get user's public profile
router.get('/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.query.requestingUserId;

        // Validate input
        if (!userId || !requestingUserId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters',
                code: 'INVALID_PARAMETERS'
            });
        }

        const user = await User.findOne({ uid: userId });
        
        // If user doesn't exist, return 404 with proper message
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found',
                code: 'PROFILE_NOT_FOUND',
                userId: userId
            });
        }

        // If requesting user is a friend, show more information
        const isFriend = user.friends.includes(requestingUserId);
        const profile = isFriend ? user : user.getPublicProfile();

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            profile: profile,
            isFriend: isFriend
        });

    } catch (error) {
        console.error('Error getting user profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving profile',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Verify phone number
router.post('/:userId/verify-phone', async (req, res) => {
    try {
        const { userId } = req.params;
        const { phoneNumber, verificationCode } = req.body;

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // TODO: Implement actual phone verification logic
        // For now, just update the phone number
        user.phoneNumber = phoneNumber;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully'
        });
    } catch (error) {
        console.error('Error verifying phone number:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying phone number',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Search users by phone number
router.get('/search/phone', async (req, res) => {
    try {
        const { phoneNumber } = req.query;
        const requestingUserId = req.query.requestingUserId;

        const users = await User.find({
            phoneNumber: { $regex: phoneNumber, $options: 'i' },
            'privacySettings.showPhoneNumber': true
        });

        const profiles = users.map(user => user.getPublicProfile());

        res.status(200).json({
            success: true,
            users: profiles
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching users',
            error: error.message,
            code: 'SERVER_ERROR'
        });
    }
});

// Get user profile
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Add actual user fetching logic
        res.json({
            message: 'User profile endpoint',
            userId
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Update user profile
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        // TODO: Add actual user update logic
        res.json({
            message: 'User update endpoint',
            userId,
            updates
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Delete user
router.delete('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Add actual user deletion logic
        res.json({
            message: 'User deletion endpoint',
            userId
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router;
