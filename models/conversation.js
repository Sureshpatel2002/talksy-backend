const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: String,
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema); 