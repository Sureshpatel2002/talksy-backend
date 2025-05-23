const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  statuses: [{
    mediaUrl: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    caption: {
      type: String,
      default: ''
    },
    viewers: [{
      userId: String,
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  }
}, { timestamps: true });

// Index for automatic deletion of expired statuses
StatusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Status', StatusSchema); 