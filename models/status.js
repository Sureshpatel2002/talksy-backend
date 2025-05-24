const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  mediaUrl: {
    type: String,
    required: true
  },
  networkUrl: {
    type: String,
    required: true,
    get: function(url) {
      // Ensure the URL is absolute
      if (url.startsWith('http')) return url;
      return `${process.env.BASE_URL || 'https://talksy-backend-z1ta.onrender.com'}${url}`;
    }
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Status expires after 24 hours (in seconds)
  },
  viewedBy: [{
    type: String, // Array of user IDs who viewed the status
    ref: 'User'
  }]
}, { timestamps: true, toJSON: { getters: true } });

// Index for automatic deletion of expired statuses
StatusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Status', StatusSchema); 