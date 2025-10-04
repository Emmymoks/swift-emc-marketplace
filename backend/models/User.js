const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  location: { type: String },
  passwordHash: { type: String, required: true },
  securityQuestion: { type: String },
  securityAnswerHash: { type: String },
  profilePhotoUrl: { type: String },
  bio: { type: String },
  currency: { type: String, default: 'USD' },
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
