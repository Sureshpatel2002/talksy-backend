const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  photoUrl: String,
  email: String,
  bio: String,
  age: Number,
  gender: String,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
