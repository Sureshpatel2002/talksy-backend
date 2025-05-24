const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  photoUrl: String,
  statusImage: String,
  email: String,
  bio: String,
  age: Number,
  gender: String,
  fcmToken: String,
  status: {
    type: String,
    enum: ['Available', 'Busy', 'Away', 'Offline'],
    default: 'Available'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
