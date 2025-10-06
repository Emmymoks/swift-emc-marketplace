const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

function absoluteUrl(req, url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const host = `${req.protocol}://${req.get('host')}`;
  return url.startsWith('/') ? host + url : host + '/' + url;
}

function publicUserObj(userDoc, req) {
  if (!userDoc) return null;
  const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  u.profilePhotoUrl = absoluteUrl(req, u.profilePhotoUrl || '');
  delete u.passwordHash;
  delete u.securityAnswerHash;
  return u;
}

// User signup
router.post('/signup', async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      phone,
      location,
      password,
      securityQuestion,
      securityAnswer,
    } = req.body;

    if (!fullName || !username || !email || !password)
      return res.status(400).json({ error: 'Missing fields' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(400).json({ error: 'Email or username already in use' });

    const pwHash = await bcrypt.hash(password, 10);
    const saHash = securityAnswer
      ? await bcrypt.hash(securityAnswer, 10)
      : null;

    const user = new User({
      fullName,
      username,
      email,
      phone,
      location,
      passwordHash: pwHash,
      securityQuestion,
      securityAnswerHash: saHash,
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'dev_secret', {
      expiresIn: '7d',
    });
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'dev_secret', {
      expiresIn: '7d',
    });
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile
router.get('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });

    const token = auth.replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(data.id).select('-passwordHash -securityAnswerHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUserObj(user, req) });
  } catch (err) {
    console.error('Profile fetch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(data.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      profilePhotoUrl,
      bio,
      location,
      currency,
      language,
      email,
      phone,
      fullName,
    } = req.body;

    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ error: 'Email already in use' });
      user.email = email;
    }

    user.fullName = fullName || user.fullName;
    user.phone = phone || user.phone;
    user.profilePhotoUrl = profilePhotoUrl || user.profilePhotoUrl;
    user.bio = bio || user.bio;
    user.location = location || user.location;
    user.currency = currency || user.currency;
    user.language = language || user.language;

    await user.save();
    res.json({ ok: true, user: publicUserObj(user, req) });
  } catch (err) {
    console.error('Profile update error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public user by username (for listing cards/profile visits)
router.get('/user/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).select('-passwordHash -securityAnswerHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUserObj(user, req) });
  } catch (err) {
    console.error('Public user fetch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Password recovery via security question
router.post('/recover', async (req, res) => {
  try {
    const { emailOrUsername, securityAnswer, newPassword } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.securityAnswerHash)
      return res.status(400).json({ error: 'No security question set' });

    if (!securityAnswer) {
      return res.json({ securityQuestion: user.securityQuestion });
    }

    const ok = await bcrypt.compare(securityAnswer, user.securityAnswerHash);
    if (!ok) return res.status(400).json({ error: 'Wrong answer' });

    if (newPassword) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await user.save();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Recover error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
