const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, username, email, phone, location, password, securityQuestion, securityAnswer } = req.body;
    if (!fullName || !username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ error: 'Email or username already in use' });
    const pwHash = await bcrypt.hash(password, 10);
    const saHash = securityAnswer ? await bcrypt.hash(securityAnswer, 10) : null;
    const user = new User({ fullName, username, email, phone, location, passwordHash: pwHash, securityQuestion, securityAnswerHash: saHash });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// complete profile
router.put('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(data.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { profilePhotoUrl, bio, location, currency, language } = req.body;
    user.profilePhotoUrl = profilePhotoUrl || user.profilePhotoUrl;
    user.bio = bio || user.bio;
    user.location = location || user.location;
    user.currency = currency || user.currency;
    user.language = language || user.language;
    await user.save();
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// reset username/password via security question
router.post('/recover', async (req, res) => {
  try {
    const { emailOrUsername, securityAnswer, newPassword } = req.body;
    const user = await User.findOne({ $or: [{ email: emailOrUsername }, { username: emailOrUsername }] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.securityAnswerHash) return res.status(400).json({ error: 'No security answer set' });
    const ok = await bcrypt.compare(securityAnswer, user.securityAnswerHash);
    if (!ok) return res.status(400).json({ error: 'Wrong answer' });
    if (newPassword) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await user.save();
      return res.json({ ok: true });
    } else {
      return res.json({ securityQuestion: user.securityQuestion });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
